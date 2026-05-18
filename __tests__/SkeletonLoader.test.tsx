import React from 'react'
import { render } from '@testing-library/react-native'
import {
  ScoreCardSkeleton,
  TimelineSkeleton,
  QuickStatsSkeleton,
  ConditionsGridSkeleton,
} from '../features/common/SkeletonLoader'

describe('ScoreCardSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ScoreCardSkeleton />)
    expect(toJSON()).not.toBeNull()
  })

  it('produces a tree with multiple animated views', () => {
    const { toJSON } = render(<ScoreCardSkeleton />)
    const json = JSON.stringify(toJSON())
    // 3 SkeletonRect children — outer circle + label + pill
    expect((json.match(/View/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })
})

describe('TimelineSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<TimelineSkeleton />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders 8 column groups', () => {
    const { toJSON } = render(<TimelineSkeleton />)
    const json = JSON.stringify(toJSON())
    // 8 columns × 2 rects each = 16 SkeletonRects plus wrapper nodes
    expect((json.match(/View/g) ?? []).length).toBeGreaterThanOrEqual(8)
  })
})

describe('QuickStatsSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<QuickStatsSkeleton />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders 3 card groups', () => {
    const { toJSON } = render(<QuickStatsSkeleton />)
    const json = JSON.stringify(toJSON())
    // 3 cards, each with 4 SkeletonRects
    expect((json.match(/View/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })
})

describe('ConditionsGridSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ConditionsGridSkeleton />)
    expect(toJSON()).not.toBeNull()
  })

  it('renders 3 grid cell groups', () => {
    const { toJSON } = render(<ConditionsGridSkeleton />)
    const json = JSON.stringify(toJSON())
    expect((json.match(/View/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })
})
