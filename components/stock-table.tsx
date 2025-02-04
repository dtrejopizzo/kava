"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EditStockItemModal } from "./edit-stock-item-modal"
import { AddStockItemModal } from "./add-stock-item-modal"
import { Pencil, Trash2 } from "lucide-react"

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

export function StockTable() {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchField, setSearchField] = useState<"sku" | "autor" | "producto">("sku")
  const [isLoading, setIsLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)
  const [isAddingItem, setIsAddingItem] = useState(false)

  useEffect(() => {
    fetchStockItems()
  }, [])

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

  const filteredItems = useMemo(() => {
    if (!searchTerm) return stockItems.slice(-10).reverse()

    const lowercaseSearchTerm = searchTerm.toLowerCase().trim()
    return stockItems
      .filter((item) => {
        const field = searchField === "sku" ? item.sku : searchField === "autor" ? item.autor : item.producto
        return typeof field === "string" && field.toLowerCase().includes(lowercaseSearchTerm)
      })
      .slice(-10)
      .reverse()
  }, [stockItems, searchTerm, searchField])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleEdit = (item: StockItem) => {
    setEditingItem(item)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este ítem?")) {
      try {
        await deleteDoc(doc(db, "stock", id))
        setStockItems(stockItems.filter((item) => item.id !== id))
      } catch (error) {
        console.error("Error al eliminar el ítem:", error)
      }
    }
  }

  const handleSave = async (updatedItem: StockItem) => {
    try {
      const itemRef = doc(db, "stock", updatedItem.id)
      await updateDoc(itemRef, updatedItem)
      setStockItems(stockItems.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
      setEditingItem(null)
    } catch (error) {
      console.error("Error al actualizar el ítem:", error)
    }
  }

  const handleAddNew = async (newItem: Omit<StockItem, "id">) => {
    try {
      const docRef = await addDoc(collection(db, "stock"), newItem)
      const addedItem = { ...newItem, id: docRef.id }
      setStockItems([...stockItems, addedItem])
      setIsAddingItem(false)
    } catch (error) {
      console.error("Error al agregar el nuevo ítem:", error)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
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
        <Button onClick={() => setIsAddingItem(true)}>Nuevo producto</Button>
      </div>
      {isLoading ? (
        <p className="text-center">Cargando datos...</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio USD</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Estante</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.producto}</TableCell>
                  <TableCell>{item.autor}</TableCell>
                  <TableCell>{item.categoria}</TableCell>
                  <TableCell>${item.precioUSD.toFixed(2)}</TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell>{item.estante}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="mr-2">
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredItems.length === 0 && (
            <p className="text-center mt-4">No se encontraron resultados para la búsqueda.</p>
          )}
        </>
      )}
      {editingItem && (
        <EditStockItemModal item={editingItem} onSave={handleSave} onCancel={() => setEditingItem(null)} />
      )}
      {isAddingItem && <AddStockItemModal onSave={handleAddNew} onCancel={() => setIsAddingItem(false)} />}
    </div>
  )
}

