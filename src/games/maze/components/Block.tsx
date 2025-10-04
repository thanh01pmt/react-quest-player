// src/games/maze/components/Block.tsx

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { GameAssets } from '../config/gameAssets';

interface BlockProps {
  modelKey: string;
  position: [number, number, number];
}

const TILE_SIZE = 2; // Import this constant for consistency if needed, or define locally

const Block: React.FC<BlockProps> = ({ modelKey, position }) => {
  // 1. Tra cứu đường dẫn model từ GameAssets
  const modelKeyParts = modelKey.split('.');
  const modelCategory = modelKeyParts[0] as keyof typeof GameAssets.world;
  const modelName = modelKeyParts[1] as keyof typeof GameAssets.world[typeof modelCategory];
  // @ts-ignore - Bỏ qua kiểm tra type phức tạp ở đây vì chúng ta biết cấu trúc
  const path = GameAssets.world[modelCategory]?.[modelName];

  if (!path) {
    console.warn(`Path not found for modelKey: ${modelKey}`);
    return null;
  }

  // 2. Tải model bằng useGLTF, bật cờ preload
  const { scene } = useGLTF(path, true);

  // 3. Clone model để mỗi block là một instance riêng
  const clonedScene = useMemo(() => (scene as THREE.Group).clone(), [scene]);

  // 4. Áp dụng thuộc tính đổ bóng cho tất cả các mesh trong model
  useEffect(() => {
    clonedScene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  // 5. Render model đã clone tại vị trí được chỉ định
  return (
    <primitive
      object={clonedScene}
      position={position}
      // SỬA LỖI: Thêm scale và điều chỉnh vị trí Y
      scale={TILE_SIZE}
      position-y={TILE_SIZE / 2} // Nâng khối lên để đáy nằm trên y=0
    />
  );
};

// Sử dụng React.memo để tối ưu hóa hiệu năng, vì các block là tĩnh
export default React.memo(Block);