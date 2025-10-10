import json
from typing import Set, Dict, List, Tuple, Any, Optional
from collections import Counter


# --- SECTION 1: TYPE DEFINITIONS (Định nghĩa kiểu dữ liệu) ---
Action = str
Position = Dict[str, int]
PlayerStart = Dict[str, int]

# --- SECTION 2: GAME WORLD MODEL (Mô hình hóa thế giới game) ---
# --- SECTION 2: GAME WORLD MODEL (Mô hình hóa thế giới game) ---
class GameWorld:
    """Đọc và hiểu file JSON, xây dựng một bản đồ thế giới chi tiết với các thuộc tính model."""
    
    # --- Định nghĩa "Luật Chơi" cho các model ---
    # SỬA LỖI: Thụt đầu dòng cho các biến của class
    WALKABLE_GROUNDS: Set[str] = {
        'ground.checker', 'ground.earth', 'ground.earthChecker', 'ground.normal', 
        'ground.snow', 'ground.mud', 'water', 'ice'
    }
    SOLID_WALLS: Set[str] = {
        'stone01', 'stone02', 'stone03', 'stone04', 'stone05', 'stone06', 'stone07',
        'wall.brick01', 'wall.brick02', 'wall.brick03', 'wall.brick04', 'wall.brick05', 'wall.brick06', 'wall.stone'
    }
    DEADLY_OBSTACLES: Set[str] = {'lava'}
    
    # SỬA LỖI: Thụt đầu dòng cho phương thức __init__
    def __init__(self, json_data: Dict[str, Any]):
        config = json_data['gameConfig']
        self.start_info: PlayerStart = config['players'][0]['start']
        self.finish_pos: Position = config['finish']

        # --- Xây dựng world_map chi tiết ---
        self.world_map: Dict[str, str] = {} # Key: 'x-y-z', Value: 'modelKey'
        for block in config.get('blocks', []):
            pos_key = f"{block['position']['x']}-{block['position']['y']}-{block['position']['z']}"
            self.world_map[pos_key] = block['modelKey']
        
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
        self.switch_states: Dict[str, str] = {
            s['id']: s['initialState'] for s in world.switches.values()
        }

    def clone(self) -> 'GameState':
        """Tạo một bản sao của trạng thái để tránh thay đổi trạng thái gốc."""
        new_state = GameState({'x': self.x, 'y': self.y, 'z': self.z, 'direction': self.direction}, GameWorld({"gameConfig": {"players": [{"start": {}}], "finish": {}, "blocks": []}}))
        new_state.collected_items = self.collected_items.copy()
        new_state.switch_states = self.switch_states.copy()
        return new_state

    def get_key(self) -> str:
        """Tạo key duy nhất để kiểm tra các trạng thái đã đi qua."""
        items = ",".join(sorted(list(self.collected_items)))
        switches = ",".join(sorted([f"{k}:{v}" for k, v in self.switch_states.items()]))
        return f"{self.x},{self.y},{self.z},{self.direction}|i:{items}|s:{switches}"

class PathNode:
    """Nút chứa trạng thái và các thông tin chi phí cho thuật toán A*."""
    def __init__(self, state: GameState):
        self.state = state
        self.parent: Optional['PathNode'] = None
        self.action: Optional[Action] = None
        self.g_cost: int = 0  # Chi phí đã đi (số hành động)
        self.h_cost: int = 0  # Chi phí ước tính đến đích

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
        """Hàm ước tính chi phí, "bộ não" của A*."""
        h = 0
        current_pos = {'x': state.x, 'y': state.y, 'z': state.z}
        
        uncollected_count = len(world.collectibles) - len(state.collected_items)
        untoggled_count = sum(1 for s_id, s_val in state.switch_states.items() 
                              if any(s['id'] == s_id and s['initialState'] == s_val for s in world.switches.values()))
        
        h += (uncollected_count + untoggled_count) * 10  # "Phạt" 10 điểm cho mỗi mục tiêu chưa xong
        h += manhattan(current_pos, world.finish_pos)
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

        # 1. Kiểm tra điều kiện thắng
        state = current_node.state
        is_at_finish = state.x == world.finish_pos['x'] and state.y == world.finish_pos['y'] and state.z == world.finish_pos['z']
        all_collected = len(state.collected_items) == len(world.collectibles)
        all_switched = not any(s['id'] == s_id and s['initialState'] == s_val for s_id, s_val in state.switch_states.items() for s in world.switches.values())

        if is_at_finish and all_collected and all_switched:
            path: List[Action] = []
            curr = current_node
            while curr and curr.action:
                path.insert(0, curr.action)
                curr = curr.parent
            return path

        # 2. Lấy các hành động và trạng thái tiếp theo
        # Hướng: 0:Bắc(-z), 1:Đông(+x), 2:Nam(+z), 3:Tây(-x)
        DIRECTIONS = [(0, 0, -1), (1, 0, 0), (0, 0, 1), (-1, 0, 0)]
        for action in ['moveForward', 'jump', 'turnLeft', 'turnRight', 'collect', 'toggleSwitch']:
            next_state = state.clone()
            is_valid_move = False
            current_pos_key = f"{state.x}-{state.y}-{state.z}"

            if action in ['moveForward', 'jump']:
                dx, _, dz = DIRECTIONS[state.direction]
                dy = 1 if action == 'jump' else 0 # jump tăng y lên 1
                
                next_x, next_y, next_z = state.x + dx, state.y + dy, state.z + dz
            
                portal_key = f"{next_x}-{next_y}-{next_z}"
                if portal_key in world.portals:
                    target_pos = world.portals[portal_key]['targetPosition']
                    next_x, next_y, next_z = target_pos['x'], target_pos['y'], target_pos['z']

                # --- LOGIC KIỂM TRA VA CHẠM VÀ ĐỊA HÌNH NÂNG CAO ---
                dest_key = f"{next_x}-{next_y}-{next_z}"
                ground_key = f"{next_x}-{next_y - 1}-{next_z}"

                model_at_dest = world.world_map.get(dest_key)
                model_at_ground = world.world_map.get(ground_key)

                # Điều kiện 1: Điểm đến không phải là tường
                is_dest_clear = model_at_dest is None or model_at_dest not in GameWorld.SOLID_WALLS
                
                # Điều kiện 2: Nền đất ở dưới phải an toàn để đứng
                is_ground_safe = model_at_ground is not None and \
                                 model_at_ground in GameWorld.WALKABLE_GROUNDS and \
                                 model_at_ground not in GameWorld.DEADLY_OBSTACLES

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
                item = world.collectibles.get(current_pos_key)
                if item and item['id'] not in state.collected_items:
                    next_state.collected_items.add(item['id'])
                    is_valid_move = True
            elif action == 'toggleSwitch':
                switch = world.switches.get(current_pos_key)
                if switch:
                    current_switch_state = state.switch_states[switch['id']]
                    next_state.switch_states[switch['id']] = 'off' if current_switch_state == 'on' else 'on'
                    is_valid_move = True
            
            if is_valid_move:
                if next_state.get_key() in visited:
                    continue
                
                next_node = PathNode(next_state)
                next_node.parent = current_node
                next_node.action = action
                next_node.g_cost = current_node.g_cost + 1
                next_node.h_cost = heuristic(next_state)
                open_list.append(next_node)

    return None  # Không tìm thấy lời giải

def find_most_frequent_sequence(actions: List[str], min_len=3, max_len=10) -> Optional[Tuple[List[str], int]]:
    """Tìm chuỗi con xuất hiện thường xuyên nhất để đề xuất tạo Hàm."""
    sequence_counts = Counter()
    # Chuyển actions thành tuple để có thể băm được
    actions_tuple = tuple(actions)
    
    for length in range(min_len, max_len + 1):
        for i in range(len(actions_tuple) - length + 1):
            sequence = actions_tuple[i:i+length]
            sequence_counts[sequence] += 1
    
    if not sequence_counts:
        return None

    most_common = None
    max_freq = 1
    for seq, freq in sequence_counts.items():
        # Ưu tiên chuỗi tiết kiệm được nhiều khối lệnh nhất
        # Tiết kiệm = (số lần lặp - 1) * độ dài chuỗi - (độ dài chuỗi + 1)
        savings = (freq - 1) * len(seq) - 1
        if freq > 1 and savings > 0:
             if most_common is None or savings > ((sequence_counts[most_common] - 1) * len(most_common) - 1):
                most_common = seq
                max_freq = freq
            
    return (list(most_common), max_freq) if most_common else None

def compress_actions_to_structure(actions: List[str]) -> List[Dict]:
    """
    Hàm đệ quy cốt lõi: Nén một chuỗi hành động phẳng thành cấu trúc có vòng lặp.
    Nó cũng xử lý việc chuyển đổi chuỗi 'CALL:...' thành dict.
    """
    if not actions:
        return []
    
    structured_code = []
    i = 0
    while i < len(actions):
        best_seq_len = 0
        best_repeats = 0
        # Tìm chuỗi con lặp lại dài nhất bắt đầu từ i
        for seq_len in range(1, len(actions) // 2 + 1):
            if i + 2 * seq_len > len(actions): break
            
            repeats = 1
            while i + (repeats + 1) * seq_len <= len(actions) and \
                  actions[i : i + seq_len] == actions[i + repeats * seq_len : i + (repeats + 1) * seq_len]:
                repeats += 1
            
            # Chỉ nén nếu nó thực sự tiết kiệm khối lệnh
            if repeats > 1:
                # Chi phí không nén: repeats * seq_len
                # Chi phí nén: 1 (khối repeat) + seq_len
                if (repeats * seq_len) > (1 + seq_len):
                    if seq_len > best_seq_len:
                        best_seq_len = seq_len
                        best_repeats = repeats

        if best_repeats > 0:
            sequence_to_repeat = actions[i : i + best_seq_len]
            structured_code.append({
                "type": "maze_repeat",
                "times": best_repeats,
                "body": compress_actions_to_structure(sequence_to_repeat) # Đệ quy
            })
            i += best_repeats * best_seq_len
        else:
            action_str = actions[i]
            if action_str.startswith("CALL:"):
                _, proc_name = action_str.split(":", 1)
                structured_code.append({"type": "CALL", "name": proc_name})
            else:
                structured_code.append({"type": action_str})
            i += 1
            
    return structured_code

def synthesize_program(actions: List[Action]) -> Dict:
    """Quy trình tổng hợp code chính."""
    procedures = {}
    # Luôn làm việc trên một danh sách các chuỗi (strings)
    remaining_actions: List[str] = list(actions) 
    
    for i in range(3): # Giới hạn 3 hàm
        result = find_most_frequent_sequence(remaining_actions)
        if result:
            sequence, freq = result
            proc_name = f"PROCEDURE_{i+1}"
            
            # Định nghĩa hàm với phần thân đã được nén đệ quy
            procedures[proc_name] = compress_actions_to_structure(sequence)
            
            # Thay thế chuỗi bằng chuỗi 'CALL:...' trong chương trình chính
            new_actions = []
            j = 0
            sequence_tuple = tuple(sequence)
            while j < len(remaining_actions):
                if tuple(remaining_actions[j:j+len(sequence)]) == sequence_tuple:
                    new_actions.append(f"CALL:{proc_name}")
                    j += len(sequence)
                else:
                    new_actions.append(remaining_actions[j])
                    j += 1
            remaining_actions = new_actions
        else:
            break

    # Nén vòng lặp cho chương trình chính cuối cùng
    main_body = compress_actions_to_structure(remaining_actions)
    
    return {"main": main_body, "procedures": procedures}


def format_program(program: Dict, indent=0) -> str:
    """Hàm helper để in chương trình ra màn hình THEO ĐÚNG CẤU TRÚC BLOCKLY."""
    output = ""
    prefix = "  " * indent
    
    # In các hàm đã định nghĩa (nếu có)
    if indent == 0 and program["procedures"]:
        for name, body in program["procedures"].items():
            output += f"{prefix}DEFINE {name}:\n"
            output += format_program({"main": body}, indent + 1)
        output += "\n"

    # In chương trình chính, bao bọc bởi khối maze_start
    if indent == 0:
        output += f"{prefix}MAIN PROGRAM:\n"
        # Thêm khối maze_start một cách rõ ràng
        output += f"{prefix}  On start:\n"
        # Tăng indent cho các khối bên trong maze_start
        indent += 2 
        prefix = "  " * indent

    # Lấy phần thân để in (có thể là main hoặc body của repeat/procedure)
    body_to_print = program.get("main", program.get("body", []))

    for block in body_to_print:
        block_type = block.get("type")
        if block_type == 'maze_repeat':
            output += f"{prefix}repeat {block['times']} times:\n"
            # Gọi đệ quy cho phần thân của vòng lặp
            output += format_program(block, indent + 1)
        elif block_type == 'CALL':
            output += f"{prefix}CALL {block['name']}\n"
        else:
            output += f"{prefix}{block_type}\n"
            
    return output


# --- SECTION 6: MAIN EXECUTION BLOCK (Phần thực thi chính) ---
if __name__ == "__main__":
    try:
        print("Đang tải file json...")
        # Sửa tên file ở đây để khớp với file của bạn, ví dụ "maze-3d-4.json"
        with open("maze-3d-test.json", "r", encoding="utf-8") as f: 
            level_data = json.load(f)
        
        print("Đã tải xong. Bắt đầu Giai đoạn 1: Tìm đường đi tối ưu bằng A*...")
        optimal_actions = solve_level(GameWorld(level_data))
        
        if optimal_actions:
            print(f"GIAI ĐOẠN 1 HOÀN TẤT: Tìm thấy chuỗi {len(optimal_actions)} hành động tối ưu.")
            
            print("\nBắt đầu Giai đoạn 2: Tổng hợp thành chương trình có cấu trúc...")
            program_solution = synthesize_program(optimal_actions)
            
            print("\nGIAI ĐOẠN 2 HOÀN TẤT: Lời giải tối ưu về cấu trúc là:")
            print("=" * 40)
            print(format_program(program_solution).strip())
            print("=" * 40)

        else:
            print("❌ KHÔNG TÌM THẤY LỜI GIẢI cho level này.")

    except FileNotFoundError:
        print("LỖI: Không tìm thấy file 'level.json'. Hãy chắc chắn file đó ở cùng thư mục với script.")
    except Exception as e:
        import traceback
        print(f"Đã xảy ra lỗi không mong muốn: {e}")
        traceback.print_exc()