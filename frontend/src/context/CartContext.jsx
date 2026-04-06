import { createContext, useContext, useMemo, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  const addToCart = (menuItem) => {
    setItems((prev) => {
      const existing = prev.find((x) => x.id === menuItem.id)
      if (existing) {
        return prev.map((x) =>
          x.id === menuItem.id ? { ...x, quantity: x.quantity + 1 } : x
        )
      }
      return [...prev, { ...menuItem, quantity: 1 }]
    })
  }

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((x) => x.id !== id))
      return
    }
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, quantity } : x)))
  }

  const clearCart = () => setItems([])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items]
  )

  return (
    <CartContext.Provider value={{ items, addToCart, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
