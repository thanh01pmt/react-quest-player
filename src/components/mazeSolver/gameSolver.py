import json
import sys
import traceback
from typing import Set, Dict, List, Tuple, Any, Optional
from collections import Counter

# --- SECTION 1: TYPE DEFINITIONS (Định nghĩa kiểu dữ liệu) ---
Action = str
Position = Dict[str, int]
PlayerStart = Dict[str, int]


# --- SECTION 2: GAME WORLD MODEL (Mô hình hóa thế giới game) ---
class GameWorld:
    """Đọc và hiểu file JSON, xây dựng một bản đồ thế giới chi tiết với các thuộc tính model."""
    WALKABLE_GROUNDS: Set[str] = {
        'ground.checker', 'ground.earth', 'ground.earthChecker', 'ground.normal', 
        'ground.snow', 'ground.mud', 'water', 'ice'
    }
    SOLID_WALLS: Set[str] = {
        'stone01', 'stone02', 'stone03', 'stone04', 'stone05', 'stone06', 'stone07',
        'wall.brick01', 'wall.brick02', 'wall.brick03', 'wall.brick04', 'wall.brick05', 'wall.brick06', 'wall.stone'
    }
    DEADLY_OBSTACLES: Set[str] = {'lava'}
    
    def __init__(self, json_data: Dict[str, Any]):
        config = json_data['gameConfig']
        self.start_info: PlayerStart = config['players'][0]['start']
        self.finish_pos: Position = config['finish']
        self.world_map: Dict[str, str] = {
            f"{block['position']['x']}-{block['position']['y']}-{block['position']['z']}": block['modelKey']
            for block in config.get('blocks', [])
        }
        self.collectibles: Dict[str, Dict] = {
            f"{c['position']['x']}-{c['position']['y']}-{c['position']['z']}": c
            for c in config.get('collectibles', [])
        }
        self.switches: Dict[str, Dict] = {}
        self.portals: Dict[str, Dict] = {}
        all_interactibles = config.get('interactibles', [])
        for i in all_interactibles:
            pos_key = f"{i['position']['x']}-{i['position']['y']}-{i['position']['z']}"
            if i['type'] == 'switch':
                self.switches[pos_key] = i
            elif i['type'] == 'portal':
                target_portal = next((p for p in all_interactibles if p['id'] == i['targetId']), None)
                if target_portal:
                    i['targetPosition'] = target_portal['position']
                    self.portals[pos_key] = i

# --- SECTION 3: GAME STATE & PATH NODE (Trạng thái game và Nút tìm đường) ---
class GameState:
    """Đại diện cho một "bản chụp" của toàn bộ game tại một thời điểm."""
    def __init__(self, start_info: PlayerStart, world: GameWorld):
        self.x, self.y, self.z = start_info['x'], start_info['y'], start_info['z']
        self.direction = start_info['direction']
        self.collected_items: Set[str] = set()
        self.switch_states: Dict[str, str] = {s['id']: s['initialState'] for s in world.switches.values()}

    def clone(self) -> 'GameState':
        new_state = GameState(self.__dict__, GameWorld({"gameConfig": {"players": [{"start": {}}], "finish": {}, "blocks": []}}))
        new_state.collected_items = self.collected_items.copy()
        new_state.switch_states = self.switch_states.copy()
        return new_state

    def get_key(self) -> str:
        items = ",".join(sorted(list(self.collected_items)))
        switches = ",".join(sorted([f"{k}:{v}" for k, v in self.switch_states.items()]))
        return f"{self.x},{self.y},{self.z},{self.direction}|i:{items}|s:{switches}"

class PathNode:
    """Nút chứa trạng thái và các thông tin chi phí cho thuật toán A*."""
    def __init__(self, state: GameState):
        self.state = state
        self.parent: Optional['PathNode'] = None
        self.action: Optional[Action] = None
        self.g_cost: int = 0
        self.h_cost: int = 0

    @property
    def f_cost(self) -> int:
        return self.g_cost + self.h_cost

# --- SECTION 4: A* SOLVER (Thuật toán A*) ---
def solve_level(world: GameWorld) -> Optional[List[Action]]:
    """Thực thi thuật toán A* để tìm lời giải tối ưu cho level."""
    start_state = GameState(world.start_info, world)
    start_node = PathNode(start_state)
    open_list: List[PathNode] = []
    visited: Set[str] = set()

    def manhattan(p1: Position, p2: Position) -> int:
        return abs(p1['x'] - p2['x']) + abs(p1['y'] - p2['y']) + abs(p1['z'] - p2['z'])

    def heuristic(state: GameState) -> int:
        h = 0
        current_pos = {'x': state.x, 'y': state.y, 'z': state.z}
        uncollected_ids = {c['id'] for c in world.collectibles.values()} - state.collected_items
        uncollected_positions = [c['position'] for c in world.collectibles.values() if c['id'] in uncollected_ids]

        if uncollected_positions:
            closest_dist = min(manhattan(current_pos, pos) for pos in uncollected_positions)
            h += closest_dist
            if len(uncollected_positions) > 1:
                h += max(manhattan(pos, world.finish_pos) for pos in uncollected_positions)
        else:
            h += manhattan(current_pos, world.finish_pos)
        h += len(uncollected_positions) * 10
        return h

    start_node.h_cost = heuristic(start_state)
    open_list.append(start_node)

    while open_list:
        open_list.sort(key=lambda node: node.f_cost)
        current_node = open_list.pop(0)
        state_key = current_node.state.get_key()
        if state_key in visited:
            continue
        visited.add(state_key)

        state = current_node.state
        is_at_finish = state.x == world.finish_pos['x'] and state.y == world.finish_pos['y'] and state.z == world.finish_pos['z']
        all_collected = len(state.collected_items) == len(world.collectibles)
        
        if is_at_finish and all_collected:
            path: List[Action] = []
            curr = current_node
            while curr and curr.action:
                path.insert(0, curr.action)
                curr = curr.parent
            return path

        DIRECTIONS = [(0, 0, -1), (1, 0, 0), (0, 0, 1), (-1, 0, 0)]
        for action in ['moveForward', 'turnLeft', 'turnRight', 'collect', 'jump', 'toggleSwitch']:
            next_state = state.clone()
            is_valid_move = False
            current_pos_key = f"{state.x}-{state.y}-{state.z}"

            if action in ['moveForward', 'jump']:
                dx, _, dz = DIRECTIONS[state.direction]
                dy = 1 if action == 'jump' else 0
                next_x, next_y, next_z = state.x + dx, state.y + dy, state.z + dz
                
                dest_key = f"{next_x}-{next_y}-{next_z}"
                ground_key = f"{next_x}-{next_y-1}-{next_z}"
                model_at_dest = world.world_map.get(dest_key)
                model_at_ground = world.world_map.get(ground_key)
                
                is_dest_clear = model_at_dest is None or model_at_dest not in GameWorld.SOLID_WALLS
                is_ground_safe = model_at_ground is not None and model_at_ground in GameWorld.WALKABLE_GROUNDS
                
                if not is_ground_safe and action == 'moveForward' and dy == 0:
                    fall_ground_key = f"{next_x}-{next_y-2}-{next_z}"
                    if world.world_map.get(fall_ground_key) in GameWorld.WALKABLE_GROUNDS:
                        next_y -= 1
                        is_ground_safe = True

                if is_dest_clear and is_ground_safe:
                    next_state.x, next_state.y, next_state.z = next_x, next_y, next_z
                    is_valid_move = True
            elif action == 'turnLeft':
                next_state.direction = (state.direction + 3) % 4
                is_valid_move = True
            elif action == 'turnRight':
                next_state.direction = (state.direction + 1) % 4
                is_valid_move = True
            elif action == 'collect':
                if current_pos_key in world.collectibles and world.collectibles[current_pos_key]['id'] not in state.collected_items:
                    next_state.collected_items.add(world.collectibles[current_pos_key]['id'])
                    is_valid_move = True
            elif action == 'toggleSwitch':
                if current_pos_key in world.switches:
                    switch = world.switches[current_pos_key]
                    current_switch_state = state.switch_states[switch['id']]
                    next_state.switch_states[switch['id']] = 'off' if current_switch_state == 'on' else 'on'
                    is_valid_move = True
            
            if is_valid_move:
                if next_state.get_key() in visited: continue
                next_node = PathNode(next_state)
                next_node.parent, next_node.action = current_node, action
                next_node.g_cost = current_node.g_cost + 1
                next_node.h_cost = heuristic(next_state)
                open_list.append(next_node)
    return None

# --- SECTION 5: CODE SYNTHESIS & OPTIMIZATION (Tổng hợp & Tối ưu code) ---
def find_most_frequent_sequence(actions: List[str], min_len=3, max_len=10) -> Optional[Tuple[List[str], int]]:
    """Tìm chuỗi con xuất hiện thường xuyên nhất để đề xuất tạo Hàm."""
    sequence_counts = Counter()
    actions_tuple = tuple(actions)
    for length in range(min_len, max_len + 1):
        for i in range(len(actions_tuple) - length + 1):
            sequence_counts[actions_tuple[i:i+length]] += 1
    
    most_common, max_freq, best_savings = None, 1, 0
    for seq, freq in sequence_counts.items():
        if freq > 1:
            savings = (freq - 1) * len(seq) - (len(seq) + freq)
            if savings > best_savings:
                best_savings, most_common, max_freq = savings, seq, freq
    return (list(most_common), max_freq) if most_common else None

def compress_actions_to_structure(actions: List[str]) -> List[Dict]:
    """Hàm đệ quy nén chuỗi hành động thành cấu trúc có vòng lặp."""
    if not actions: return []
    structured_code, i = [], 0
    while i < len(actions):
        best_seq_len, best_repeats = 0, 0
        for seq_len in range(1, len(actions) // 2 + 1):
            if i + 2 * seq_len > len(actions): break
            repeats = 1
            while i + (repeats + 1) * seq_len <= len(actions) and \
                  actions[i:i+seq_len] == actions[i+repeats*seq_len:i+(repeats+1)*seq_len]:
                repeats += 1
            if repeats > 1 and (repeats * seq_len) > (1 + seq_len) and seq_len >= best_seq_len:
                best_seq_len, best_repeats = seq_len, repeats
        
        if best_repeats > 0:
            structured_code.append({
                "type": "maze_repeat",
                "times": best_repeats,
                "body": compress_actions_to_structure(actions[i:i+best_seq_len])
            })
            i += best_repeats * best_seq_len
        else:
            action_str = actions[i]
            if action_str.startswith("CALL:"):
                structured_code.append({"type": "CALL", "name": action_str.split(":", 1)[1]})
            else:
                structured_code.append({"type": action_str})
            i += 1
    return structured_code

def synthesize_program(actions: List[Action]) -> Dict:
    """Quy trình tổng hợp code chính, tạo hàm và vòng lặp."""
    procedures, remaining_actions = {}, list(actions)
    for i in range(3):
        result = find_most_frequent_sequence(remaining_actions)
        if result:
            sequence, proc_name = result[0], f"PROCEDURE_{i+1}"
            procedures[proc_name] = compress_actions_to_structure(sequence)
            new_actions, j, seq_tuple = [], 0, tuple(sequence)
            while j < len(remaining_actions):
                if tuple(remaining_actions[j:j+len(sequence)]) == seq_tuple:
                    new_actions.append(f"CALL:{proc_name}")
                    j += len(sequence)
                else:
                    new_actions.append(remaining_actions[j])
                    j += 1
            remaining_actions = new_actions
        else: break
    return {"main": compress_actions_to_structure(remaining_actions), "procedures": procedures}

# --- SECTION 6: REPORTING & UTILITIES (Báo cáo & Tiện ích) ---

def count_blocks(program: Dict) -> int:
    """
    [CHỨC NĂNG MỚI] Đệ quy đếm tổng số khối lệnh trong chương trình đã tối ưu.
    Mỗi lệnh, vòng lặp, định nghĩa hàm, lời gọi hàm đều được tính là 1 khối.
    """
    def _count_list_recursively(block_list: List[Dict]) -> int:
        count = 0
        for block in block_list:
            count += 1  # Đếm khối lệnh hiện tại (move, repeat, call,...)
            if block.get("type") == "maze_repeat":
                # Nếu là vòng lặp, đệ quy đếm các khối bên trong nó
                count += _count_list_recursively(block.get("body", []))
        return count

    total = 0
    # Đếm các khối trong các hàm đã định nghĩa
    if "procedures" in program:
        for name, body in program["procedures"].items():
            total += 1  # Đếm khối "DEFINE PROCEDURE"
            total += _count_list_recursively(body)
    
    # Đếm các khối trong chương trình chính
    total += 1 # Đếm khối "On start"
    total += _count_list_recursively(program.get("main", []))
    
    return total

def format_program(program: Dict, indent=0) -> str:
    """Hàm helper để in chương trình ra màn hình theo cấu trúc Blockly."""
    output, prefix = "", "  " * indent
    if indent == 0 and program["procedures"]:
        for name, body in program["procedures"].items():
            output += f"{prefix}DEFINE {name}:\n"
            output += format_program({"main": body}, indent + 1)
        output += "\n"
    if indent == 0:
        output += f"{prefix}MAIN PROGRAM:\n{prefix}  On start:\n"
        indent += 2
        prefix = "  " * indent
    
    body_to_print = program.get("main", program.get("body", []))
    for block in body_to_print:
        block_type = block.get("type")
        if block_type == 'maze_repeat':
            output += f"{prefix}repeat {block['times']} times:\n"
            output += format_program(block, indent + 1)
        elif block_type == 'CALL':
            output += f"{prefix}CALL {block['name']}\n"
        else:
            output += f"{prefix}{block_type}\n"
    return output

# --- SECTION 7: MAIN EXECUTION BLOCK (Phần thực thi chính) ---
if __name__ == "__main__":
    # [ĐÃ SỬA LỖI] Khối này giờ đây đọc tên file từ tham số dòng lệnh
    if len(sys.argv) < 2:
        print("LỖI: Bạn chưa cung cấp tên file JSON.")
        print("Cách dùng: python gameSolver.py <ten_file_json>")
        sys.exit(1)

    json_filename = sys.argv[1]

    try:
        print(f"Đang tải file '{json_filename}'...")
        with open(json_filename, "r", encoding="utf-8") as f:
            level_data = json.load(f)
        
        print("Đã tải xong. Bắt đầu Giai đoạn 1: Tìm đường đi tối ưu bằng A*...")
        optimal_actions = solve_level(GameWorld(level_data))
        
        if optimal_actions:
            print(f"GIAI ĐOẠN 1 HOÀN TẤT: Tìm thấy chuỗi {len(optimal_actions)} hành động tối ưu.")
            
            print("\nBắt đầu Giai đoạn 2: Tổng hợp thành chương trình có cấu trúc...")
            program_solution = synthesize_program(optimal_actions)
            
            # [TÍNH NĂNG MỚI] Đếm số khối lệnh sau khi tối ưu
            optimized_block_count = count_blocks(program_solution)
            
            print(f"\nGIAI ĐOẠN 2 HOÀN TẤT: Lời giải tối ưu về cấu trúc là:")
            print(f"(Tối ưu từ {len(optimal_actions)} hành động xuống còn {optimized_block_count} khối lệnh)")
            print("=" * 40)
            print(format_program(program_solution).strip())
            print("=" * 40)

        else:
            print("❌ KHÔNG TÌM THẤY LỜI GIẢI cho level này.")

    except FileNotFoundError:
        print(f"LỖI: Không tìm thấy file '{json_filename}'. Hãy chắc chắn bạn đã nhập đúng tên và file ở cùng thư mục.")
    except json.JSONDecodeError:
        print(f"LỖI: File '{json_filename}' không phải là một file JSON hợp lệ.")
    except Exception as e:
        print(f"Đã xảy ra lỗi không mong muốn: {e}")
        traceback.print_exc()