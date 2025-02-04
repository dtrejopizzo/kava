import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface StockItem {
  sku: string
  producto: string
  autor: string
  categoria: string
  precioUSD: number
  stock: number
  estante: number
}

interface AddStockItemModalProps {
  onSave: (newItem: StockItem) => void
  onCancel: () => void
}

const categories = [
  "ALFAJORES",
  "AUDIOVISUAL",
  "CAFE",
  "CHOCOLATE",
  "COMPUTACION",
  "ESCOLAR",
  "INGLES",
  "JUEGOS",
  "LIBRO",
  "LIBROS",
  "MANGA",
  "VINOS",
]

export function AddStockItemModal({ onSave, onCancel }: AddStockItemModalProps) {
  const [newItem, setNewItem] = useState<StockItem>({
    sku: "",
    producto: "",
    autor: "",
    categoria: "",
    precioUSD: 0,
    stock: 0,
    estante: 0,
  })
  const [newCategory, setNewCategory] = useState("")
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewItem((prev) => ({
      ...prev,
      [name]: name === "precioUSD" || name === "stock" || name === "estante" ? Number(value) : value,
    }))
  }

  const handleCategoryChange = (value: string) => {
    if (value === "nueva_categoria") {
      setIsAddingNewCategory(true)
    } else {
      setNewItem((prev) => ({ ...prev, categoria: value }))
    }
  }

  const handleNewCategorySubmit = () => {
    if (newCategory) {
      setNewItem((prev) => ({ ...prev, categoria: newCategory }))
      setIsAddingNewCategory(false)
      setNewCategory("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(newItem)
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Producto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sku" className="text-right">
                SKU
              </Label>
              <Input id="sku" name="sku" value={newItem.sku} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="producto" className="text-right">
                Producto
              </Label>
              <Input
                id="producto"
                name="producto"
                value={newItem.producto}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="autor" className="text-right">
                Autor
              </Label>
              <Input id="autor" name="autor" value={newItem.autor} onChange={handleChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="categoria" className="text-right">
                Categoría
              </Label>
              {isAddingNewCategory ? (
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="newCategory"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nueva categoría"
                  />
                  <Button type="button" onClick={handleNewCategorySubmit}>
                    Agregar
                  </Button>
                </div>
              ) : (
                <Select onValueChange={handleCategoryChange} value={newItem.categoria}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                    <SelectItem value="nueva_categoria">Agregar nueva categoría</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="precioUSD" className="text-right">
                Precio USD
              </Label>
              <Input
                id="precioUSD"
                name="precioUSD"
                type="number"
                value={newItem.precioUSD}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right">
                Stock
              </Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                value={newItem.stock}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="estante" className="text-right">
                Estante
              </Label>
              <Input
                id="estante"
                name="estante"
                type="number"
                value={newItem.estante}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">Agregar producto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

