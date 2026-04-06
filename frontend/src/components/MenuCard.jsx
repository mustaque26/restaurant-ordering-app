import { useCart } from '../context/CartContext'

export default function MenuCard({ item }) {
  const { addToCart } = useCart()

  return (
    <div className="card">
      <img className="card-image" src={item.imageUrl} alt={item.name} />
      <div className="card-body">
        <div className="row-between">
          <h3>{item.name}</h3>
          <span className="pill">{item.category}</span>
        </div>
        <p>{item.description}</p>
        <div className="row-between">
          <strong>₹ {item.price}</strong>
          <button onClick={() => addToCart(item)}>Add</button>
        </div>
      </div>
    </div>
  )
}
