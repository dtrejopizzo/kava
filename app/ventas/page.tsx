"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, updateDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { ReservasList } from "@/components/reservas-list"

interface StockItem {
  id: string
  sku: string
  producto: string
  autor: string
  categoria: string
  precioUSD: number
  stock: number
  estante: number
}

interface SaleItem extends StockItem {
  quantity: number
  efectivo: number
  tarjeta: number
  precioVenta: number
}

export default function VentasPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchField, setSearchField] = useState<"sku" | "autor" | "producto">("sku")
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, loading] = useAuthState(auth)
  const [exchangeRate, setExchangeRate] = useState<number>(0)

  const roundDown = (value: number): number => {
    return Math.floor(value / 100) * 100
  }

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login"
    } else if (user) {
      fetchStockItems()
      fetchExchangeRate()
    }
  }, [user, loading])

  const fetchExchangeRate = async () => {
    try {
      const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD")
      const data = await response.json()
      setExchangeRate(data.rates.ARS)
    } catch (error) {
      console.error("Error fetching exchange rate:", error)
      setExchangeRate(350) // Fallback exchange rate
    }
  }

  const fetchStockItems = async () => {
    setIsLoading(true)
    const stockCollection = collection(db, "stock")
    const querySnapshot = await getDocs(stockCollection)
    const items: StockItem[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      items.push({
        id: doc.id,
        sku: data.sku?.toString() || "",
        producto: data.producto?.toString() || "",
        autor: data.autor?.toString() || "",
        categoria: data.categoria?.toString() || "",
        precioUSD: Number(data.precioUSD) || 0,
        stock: Number(data.stock) || 0,
        estante: Number(data.estante) || 0,
      } as StockItem)
    })
    setStockItems(items)
    setIsLoading(false)
  }

  const filteredItems = stockItems
    .filter((item) => {
      if (!searchTerm) return true
      const lowercaseSearchTerm = searchTerm.toLowerCase().trim()
      const field = searchField === "sku" ? item.sku : searchField === "autor" ? item.autor : item.producto
      return typeof field === "string" && field.toLowerCase().includes(lowercaseSearchTerm)
    })
    .slice(0, 10)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const addToSale = (item: StockItem) => {
    const efectivo = roundDown(item.precioUSD * exchangeRate)
    const tarjeta = roundDown(efectivo * 1.15)
    const existingItem = saleItems.find((saleItem) => saleItem.id === item.id)
    if (existingItem) {
      setSaleItems(
        saleItems.map((saleItem) =>
          saleItem.id === item.id
            ? {
                ...saleItem,
                quantity: saleItem.quantity + 1,
                efectivo: saleItem.efectivo + efectivo,
                tarjeta: saleItem.tarjeta + tarjeta,
                precioVenta: saleItem.precioVenta + efectivo,
              }
            : saleItem,
        ),
      )
    } else {
      setSaleItems([...saleItems, { ...item, quantity: 1, efectivo, tarjeta, precioVenta: efectivo }])
    }
  }

  const removeFromSale = (itemId: string) => {
    setSaleItems(saleItems.filter((item) => item.id !== itemId))
  }

  const clearSale = () => {
    setSaleItems([])
  }

  const handlePrecioVentaChange = (itemId: string, newPrecio: number) => {
    setSaleItems(
      saleItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              precioVenta: newPrecio,
            }
          : item,
      ),
    )
  }

  const saveAsReservation = async () => {
    if (!user) {
      alert("Debes iniciar sesión para guardar una reserva.")
      return
    }
    try {
      const reservaRef = await addDoc(collection(db, "reservas"), {
        items: saleItems.map((item) => ({
          id: item.id,
          sku: item.sku,
          producto: item.producto,
          cantidad: item.quantity,
          precioVenta: item.precioVenta,
        })),
        date: new Date(),
        status: "pendiente",
        userId: user.uid,
      })

      // Actualizar el stock temporalmente
      for (const item of saleItems) {
        const stockRef = doc(db, "stock", item.id)
        await updateDoc(stockRef, {
          stock: item.stock - item.quantity,
        })
      }

      alert("Reserva guardada exitosamente")
      clearSale()
      fetchStockItems() // Actualizar la lista de stock
    } catch (error) {
      console.error("Error al guardar la reserva:", error)
      alert("Error al guardar la reserva: " + (error as Error).message)
    }
  }

  const registerSale = async () => {
    if (!user) {
      alert("Debes iniciar sesión para registrar una venta.")
      return
    }
    try {
      const timestamp = new Date()
      const ventaItems = saleItems.map((item) => ({
        TIMESTAMP: timestamp,
        SKU: item.sku,
        PRODUCTO: item.producto,
        CANTIDAD: item.quantity,
        PRECIO_VENTA: item.precioVenta,
      }))

      await addDoc(collection(db, "ventas"), {
        items: ventaItems,
        date: timestamp,
        total: saleItems.reduce((acc, item) => acc + item.precioVenta * item.quantity, 0),
        userId: user.uid,
      })

      for (const item of saleItems) {
        const stockRef = doc(db, "stock", item.id)
        await updateDoc(stockRef, {
          stock: item.stock - item.quantity,
        })
      }

      alert("Venta registrada exitosamente")
      clearSale()
      fetchStockItems()
    } catch (error) {
      console.error("Error al registrar la venta:", error)
      alert("Error al registrar la venta: " + (error as Error).message)
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Inicio</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Ventas</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="p-4">
          <Tabs defaultValue="nueva-venta" className="w-full">
            <TabsList>
              <TabsTrigger value="nueva-venta">Nueva Venta</TabsTrigger>
              <TabsTrigger value="reservas">Reservas</TabsTrigger>
            </TabsList>
            <TabsContent value="nueva-venta">
              <Card>
                <CardHeader>
                  <CardTitle>Nueva Venta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2 mb-4">
                    <Input
                      type="text"
                      placeholder={`Buscar por ${searchField}`}
                      value={searchTerm}
                      onChange={handleSearch}
                      className="w-64"
                    />
                    <select
                      className="border rounded px-2"
                      value={searchField}
                      onChange={(e) => setSearchField(e.target.value as "sku" | "autor" | "producto")}
                    >
                      <option value="sku">SKU</option>
                      <option value="autor">Autor</option>
                      <option value="producto">Producto</option>
                    </select>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Autor</TableHead>
                        <TableHead>Efectivo</TableHead>
                        <TableHead>Tarjeta</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.producto}</TableCell>
                          <TableCell>{item.autor}</TableCell>
                          <TableCell>${roundDown(item.precioUSD * exchangeRate).toFixed(2)}</TableCell>
                          <TableCell>${roundDown(item.precioUSD * exchangeRate * 1.15).toFixed(2)}</TableCell>
                          <TableCell>{item.stock}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => addToSale(item)}>
                              <Plus className="h-4 w-4" />
                              <span className="sr-only">Agregar a la venta</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Productos en la venta</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Precio de venta</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.producto}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.precioVenta.toFixed(2)}
                                onChange={(e) => handlePrecioVentaChange(item.id, Number(e.target.value))}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeFromSale(item.id)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar de la venta</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-lg font-semibold">
                        Total: ${saleItems.reduce((acc, item) => acc + item.precioVenta * item.quantity, 0).toFixed(2)}
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline" onClick={clearSale}>
                          Borrar venta
                        </Button>
                        <Button variant="outline" onClick={saveAsReservation}>
                          Guardar como reserva
                        </Button>
                        <Button onClick={registerSale}>Registrar venta</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="reservas">
              <Card>
                <CardHeader>
                  <CardTitle>Reservas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReservasList onReservaUpdated={fetchStockItems} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

