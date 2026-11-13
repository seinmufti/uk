"use client"

import Link from "next/link"
import { useState } from "react"

/**
 * A link that loads the whole page (with its data) as soon as the pointer is over it, so the click
 * opens instantly. For long lists, where prefetching every row would waste requests.
 */
export function HoverLink(props: React.ComponentProps<typeof Link>) {
  const [warm, setWarm] = useState(false)
  return (
    <Link
      {...props}
      prefetch={warm ? true : false}
      onMouseEnter={(e) => {
        setWarm(true)
        props.onMouseEnter?.(e)
      }}
      onTouchStart={(e) => {
        setWarm(true)
        props.onTouchStart?.(e)
      }}
    />
  )
}
