'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from 'react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export default function ProductImage({ src, alt, className, onError }: ProductImageProps) {
  const [prevSrc, setPrevSrc] = useState<string>(src);
  const [processedSrc, setProcessedSrc] = useState<string>(src);

  // Sync state with props in render loop to avoid cascading useEffect renders
  if (src !== prevSrc) {
    setPrevSrc(src);
    setProcessedSrc(src);
  }

  useEffect(() => {
    if (!src || src.startsWith('data:')) {
      return;
    }

    const img = new Image();
    // Allow same-origin canvas reading. Set crossOrigin only for absolute URLs
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = src;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setProcessedSrc(src);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        let minX = width;
        let maxX = 0;
        let minY = height;
        let maxY = 0;
        let hasContent = false;

        // Scan pixels to find the bounding box of non-empty (non-white, non-transparent) content
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            // Consider pixels transparent if alpha is low, or white if RGB values are all very high
            const isTransparent = a < 15;
            const isWhite = r > 245 && g > 245 && b > 245;

            if (!isTransparent && !isWhite) {
              hasContent = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (hasContent) {
          const cropW = maxX - minX + 1;
          const cropH = maxY - minY + 1;

          // Add a safety padding of 3% around the detected content to avoid kissing the edge
          const padX = Math.max(4, Math.round(cropW * 0.03));
          const padY = Math.max(4, Math.round(cropH * 0.03));

          minX = Math.max(0, minX - padX);
          maxX = Math.min(width - 1, maxX + padX);
          minY = Math.max(0, minY - padY);
          maxY = Math.min(height - 1, maxY + padY);

          const finalW = maxX - minX + 1;
          const finalH = maxY - minY + 1;

          // Crop only if we actually trimmed a meaningful border (at least 2% in either dimension)
          if (finalW < width * 0.98 || finalH < height * 0.98) {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = finalW;
            cropCanvas.height = finalH;
            const cropCtx = cropCanvas.getContext('2d');
            if (cropCtx) {
              cropCtx.drawImage(
                img,
                minX,
                minY,
                finalW,
                finalH,
                0,
                0,
                finalW,
                finalH
              );
              setProcessedSrc(cropCanvas.toDataURL());
            } else {
              setProcessedSrc(src);
            }
          } else {
            setProcessedSrc(src);
          }
        } else {
          setProcessedSrc(src);
        }
      } catch (e) {
        console.error('Failed to auto-crop product image', e);
        setProcessedSrc(src);
      }
    };

    img.onerror = () => {
      setProcessedSrc(src);
    };
  }, [src]);

  return (
    <img
      src={processedSrc}
      alt={alt}
      onError={onError}
      className={className}
      style={{
        maxHeight: '88%',
        maxWidth: '88%',
        objectFit: 'contain',
        objectPosition: 'center',
      }}
    />
  );
}
