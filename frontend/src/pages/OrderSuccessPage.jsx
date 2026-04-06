import { Link, useParams } from 'react-router-dom'

export default function OrderSuccessPage() {
  const { id } = useParams()

  return (
    <div className="success-box">
      <h2>Order Placed Successfully</h2>
      <p>Your order ID is <strong>#{id}</strong>.</p>
      <p>The restaurant can use your payment reference to verify the QR payment.</p>
      <Link to="/">Back to Menu</Link>
    </div>
  )
}
