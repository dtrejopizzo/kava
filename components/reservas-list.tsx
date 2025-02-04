"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, getDocs, getDoc, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ReservaItem {
  id: string
  sku: string
  producto: string
  cantidad: number
  precioVenta: number
}

interface Reserva {
  id: string
  date: Date
  items: ReservaItem[]
  status: string
}

interface ReservasListProps {
  onReservaUpdated: () => void
}

export function ReservasList({ onReservaUpdated }: ReservasListProps) {
  const [user] = useAuthState(auth)
  const [reservas, setReservas] = useState<Reserva[]>([])

  const fetchReservas = useCallback(async () => {
    if (!user) return

    const reservasCollection = collection(db, "reservas")
    const q = query(reservasCollection, where("userId", "==", user.uid))
    const querySnapshot = await getDocs(q)

    const reservasList: Reserva[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      reservasList.push({
        id: doc.id,
        date: data.date.toDate(),
        items: data.items,
        status: data.status,
      })
    })

    setReservas(reservasList)
  }, [user])

  useEffect(() => {
    if (user) {
      fetchReservas()
    }
  }, [user, fetchReservas])

  const handleCancelReserva = async (reservaId: string) => {
    try {
      const reservaRef = doc(db, "reservas", reservaId)
      const reservaDoc = await getDoc(reservaRef)
      const reservaData = reservaDoc.data()

      // Devolver el stock
      for (const item of reservaData.items) {
        const stockRef = doc(db, "stock", item.id)
        await updateDoc(stockRef, {
          stock: item.stock + item.cantidad,
        })
      }

      // Eliminar la reserva
      await deleteDoc(reservaRef)

      alert("Reserva cancelada exitosamente")
      fetchReservas()
      onReservaUpdated()
    } catch (error) {
      console.error("Error al cancelar la reserva:", error)
      alert("Error al cancelar la reserva: " + (error as Error).message)
    }
  }

  const handleConfirmReserva = async (reservaId: string) => {
    try {
      const reservaRef = doc(db, "reservas", reservaId)
      const reservaDoc = await getDoc(reservaRef)
      const reservaData = reservaDoc.data()

      // Registrar la venta
      await addDoc(collection(db, "ventas"), {
        items: reservaData.items.map((item: ReservaItem) => ({
          TIMESTAMP: new Date(),
          SKU: item.sku,
          PRODUCTO: item.producto,
          CANTIDAD: item.cantidad,
          PRECIO_VENTA: item.precioVenta,
        })),
        date: new Date(),
        total: reservaData.items.reduce((acc: number, item: ReservaItem) => acc + item.precioVenta * item.cantidad, 0),
        userId: user.uid,
      })

      // Eliminar la reserva
      await deleteDoc(reservaRef)

      alert("Reserva confirmada y registrada como venta exitosamente")
      fetchReservas()
      onReservaUpdated()
    } catch (error) {
      console.error("Error al confirmar la reserva:", error)
      alert("Error al confirmar la reserva: " + (error as Error).message)
    }
  }

  const handleUpdateReserva = async (reservaId: string, updatedItems: ReservaItem[]) => {
    try {
      const reservaRef = doc(db, "reservas", reservaId)
      await updateDoc(reservaRef, { items: updatedItems })

      alert("Reserva actualizada exitosamente")
      fetchReservas()
      onReservaUpdated()
    } catch (error) {
      console.error("Error al actualizar la reserva:", error)
      alert("Error al actualizar la reserva: " + (error as Error).message)
    }
  }

  return (
    <div>
      {reservas.map((reserva) => (
        <div key={reserva.id} className="mb-8 border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">
            Reserva del {reserva.date.toLocaleDateString()} - {reserva.date.toLocaleTimeString()}
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio de Venta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reserva.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.producto}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.cantidad ?? 0}
                      onChange={(e) => {
                        const updatedItems = [...reserva.items]
                        updatedItems[index].cantidad = Number(e.target.value)
                        handleUpdateReserva(reserva.id, updatedItems)
                      }}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={(item.precioVenta ?? 0).toFixed(2)}
                      onChange={(e) => {
                        const updatedItems = [...reserva.items]
                        updatedItems[index].precioVenta = Number(e.target.value)
                        handleUpdateReserva(reserva.id, updatedItems)
                      }}
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => handleCancelReserva(reserva.id)}>
              Cancelar Reserva
            </Button>
            <Button onClick={() => handleConfirmReserva(reserva.id)}>Confirmar Venta</Button>
          </div>
        </div>
      ))}
    </div>
  )
}

