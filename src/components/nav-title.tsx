"use client"

import { useSyncExternalStore } from "react"
import { createPortal } from "react-dom"

const noop = () => () => {}

/** Puts the page's title in the middle of the top bar (the #nav-title slot in the app layout). */
export function NavTitle({ title }: { title: string }) {
  const slot = useSyncExternalStore(
    noop,
    () => document.getElementById("nav-title"),
    () => null,
  )
  return slot ? createPortal(<h1 className="truncate text-base font-semibold">{title}</h1>, slot) : null
}
