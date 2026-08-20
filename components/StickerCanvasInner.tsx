"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Text, Transformer } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import { PlacedSticker } from "@/lib/types";

type Props = {
  photoUrl: string;
  stickers: PlacedSticker[];
  onChange: (stickers: PlacedSticker[]) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
  width: number;
  height: number;
};

export default function StickerCanvasInner({ photoUrl, stickers, onChange, stageRef, width, height }: Props) {
  const [img] = useImage(photoUrl, "anonymous");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const textRefs = useRef<Record<string, Konva.Text | null>>({});
  const trRef = useRef<Konva.Transformer | null>(null);

  useEffect(() => {
    if (selectedKey && trRef.current && textRefs.current[selectedKey]) {
      trRef.current.nodes([textRefs.current[selectedKey]!]);
      trRef.current.getLayer()?.batchDraw();
    } else {
      trRef.current?.nodes([]);
    }
  }, [selectedKey, stickers]);

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onMouseDown={(e) => {
        if (e.target === e.target.getStage()) setSelectedKey(null);
      }}
      onTouchStart={(e) => {
        if (e.target === e.target.getStage()) setSelectedKey(null);
      }}
    >
      <Layer listening={false}>
        {img && <KonvaImage image={img} width={width} height={height} />}
      </Layer>
      <Layer>
        {stickers.map((s) => (
          <Text
            key={s.key}
            ref={(node) => {
              textRefs.current[s.key] = node;
            }}
            text={s.glyph}
            x={s.x * width}
            y={s.y * height}
            fontSize={56 * s.scale}
            rotation={s.rotation}
            offsetX={28 * s.scale}
            offsetY={28 * s.scale}
            draggable
            onClick={() => setSelectedKey(s.key)}
            onTap={() => setSelectedKey(s.key)}
            onDragEnd={(e) => {
              onChange(
                stickers.map((st) =>
                  st.key === s.key ? { ...st, x: e.target.x() / width, y: e.target.y() / height } : st
                )
              );
            }}
            onTransformEnd={(e) => {
              const node = e.target as Konva.Text;
              const newScale = (node.scaleX() * s.scale + node.scaleY() * s.scale) / 2;
              node.scaleX(1);
              node.scaleY(1);
              onChange(
                stickers.map((st) =>
                  st.key === s.key
                    ? {
                        ...st,
                        x: node.x() / width,
                        y: node.y() / height,
                        scale: Math.max(0.3, newScale),
                        rotation: node.rotation(),
                      }
                    : st
                )
              );
            }}
          />
        ))}
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          anchorSize={22}
          borderStroke="#ff4b5c"
          anchorStroke="#ff4b5c"
          anchorFill="#fffcf7"
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 16 || newBox.height < 16 ? oldBox : newBox)}
        />
      </Layer>
    </Stage>
  );
}
