import React from 'react'

interface SparklineChartProps {
  data: number[]
  width?: number
  height?: number
  strokeColor?: string
  strokeWidth?: number
}

export default function SparklineChart({
  data,
  width = 120,
  height = 30,
  strokeColor = '#003388', // Resolution Blue default
  strokeWidth = 2
}: SparklineChartProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min === 0 ? 1 : max - min

  // Map points to SVG coordinates
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width
    // Flip y because SVG coordinates start from top-left
    const y = height - ((val - min) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const pathD = `M ${points.join(' L ')}`

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
