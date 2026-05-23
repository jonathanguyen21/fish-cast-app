import React from 'react'
import Svg, { Rect, Line } from 'react-native-svg'
import { Colors } from '../../theme/colors'
import { scoreColor } from '../score/scoringEngine'
import type { SpeciesHourlyScore } from './speciesHourlyScoring'

interface Props {
  hourly: SpeciesHourlyScore[]
  currentHour: number
  width?: number
  height?: number
}

const W = 120
const H = 20
const HOURS_START = 5
const BAR_COUNT = 16
const BAR_W = (W / BAR_COUNT) * 0.7
const BAR_GAP = (W / BAR_COUNT) * 0.3

export function MiniActivityChart({ hourly, currentHour, width = W, height = H }: Props) {
  if (hourly.length === 0) return null
  const scoreMap: Record<number, number> = {}
  for (const e of hourly) scoreMap[e.hour] = e.score

  return (
    <Svg width={width} height={height}>
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const hour = HOURS_START + i
        const score = scoreMap[hour] ?? 0
        const barH = Math.max(2, (score / 100) * (height - 2))
        const x = i * (W / BAR_COUNT) + BAR_GAP / 2
        const y = height - barH
        const isNow = hour === currentHour
        const color = score > 0 ? scoreColor(score) : Colors.surface
        return (
          <React.Fragment key={hour}>
            <Rect
              x={x}
              y={y}
              width={BAR_W}
              height={barH}
              rx={1.5}
              fill={color}
              opacity={score > 0 ? (isNow ? 1 : 0.6) : 0.3}
            />
            {isNow && (
              <Line
                x1={x + BAR_W / 2}
                y1={0}
                x2={x + BAR_W / 2}
                y2={height}
                stroke={Colors.accent}
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.8}
              />
            )}
          </React.Fragment>
        )
      })}
    </Svg>
  )
}
