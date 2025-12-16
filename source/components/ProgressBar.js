import React from 'react';
import { Box, Text } from 'ink';

const PARTIALS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']; // 0..7 (none .. 7/8)
const DEFAULT_WIDTH = 30;
const PROGRESS_CHAR = '█';
const EMPTY_CHAR = '░';

const repeatCharacter = (char, times) => char.repeat(Math.max(0, times));
const clamp01 = n => Math.max(0, Math.min(1, n));

export default function ProgressBar({ value, width = DEFAULT_WIDTH, color, colour, label }) {
  // prefer color, then colour, then fallback
  const usedColor = color ?? colour ?? 'green';

  // coerce and validate width
  const wNum = Number(width);
  const w = Number.isFinite(wNum) ? Math.max(0, Math.floor(wNum)) : DEFAULT_WIDTH;

  // coerce and clamp value
  const vNum = Number(value);
  const v = Number.isFinite(vNum) ? clamp01(vNum) : 0;

  const total = v * w;
  const full = Math.floor(total);
  const remIndex = Math.floor((total - full) * 8); // 0..7
  const partial = remIndex > 0 && full < w ? PARTIALS[remIndex] : '';

  const filled = repeatCharacter(PROGRESS_CHAR, full) + (partial || '');
  const emptyCount = Math.max(0, w - full - (partial ? 1 : 0));
  const empty = repeatCharacter(EMPTY_CHAR, emptyCount);

  const bar = filled + empty;
  const percent = Math.round(v * 100);

  return (
    <Box>
      <Text color={usedColor}>
       {label} {bar} {percent}%
      </Text>
    </Box>
  );
}