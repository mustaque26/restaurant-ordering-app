import { useEffect, useState } from 'react'
import api from '../api'
import QrSvg from '../components/QrSvg'

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  imageUrl: '',
  available: true
}

export default function AdminPage() {
  const [items, setItems] = useState([])
  const [qrUrl, setQrUrl] = useState('')
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    const [itemsRes, settingsRes] = await Promise.all([
      api.get('/menu-items'),
      api.get('/settings')
    ])
    setItems(itemsRes.data)
    setQrUrl(settingsRes.data.paymentQrImageUrl)
  }

  useEffect(() => {
    load()
  }, [])

  const createItem = async (e) => {
    e.preventDefault()
    await api.post('/menu-items', {
      ...form,
      price: Number(form.price)
    })
    setForm(emptyForm)
    load()
  }

  const toggleAvailability = async (item) => {
    await api.patch(`/menu-items/${item.id}/availability?available=${!item.available}`)
    load()
  }

  const updateQr = async () => {
    await api.put('/settings/payment-qr', { paymentQrImageUrl: qrUrl })
    alert('QR updated successfully')
  }

  return (
    <div className="admin-page">
      <div className="admin-grid">
        <div className="card pad">
          <h2>Add Menu Item</h2>
          <form onSubmit={createItem} className="form-grid">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
            <input placeholder="Category" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} required />
            <input placeholder="Price" type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required />
            <input placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({...form, imageUrl: e.target.value})} />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows="3" />
            <label className="checkbox">
              <input type="checkbox" checked={form.available} onChange={(e) => setForm({...form, available: e.target.checked})} />
              Available today
            </label>
            <button type="submit">Save Menu Item</button>
          </form>
        </div>

        <div className="card pad">
          <h2>Payment QR Settings</h2>
          <input value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} placeholder="QR image URL" />
          <button onClick={updateQr}>Update QR</button>
          {qrUrl ? (
            <img src={qrUrl} alt="QR preview" className="qr-image" />
          ) : (
            <QrSvg className="qr-image" />
          )}
        </div>
      </div>

      <div className="card pad mt">
        <h2>Daily Menu Control</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>₹ {item.price}</td>
                <td>{item.available ? 'Available' : 'Unavailable'}</td>
                <td>
                  <button onClick={() => toggleAvailability(item)}>
                    Mark {item.available ? 'Unavailable' : 'Available'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
