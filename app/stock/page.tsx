"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"
import { collection, addDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { AppSidebar } from "@/components/app-sidebar"
import { StockTable } from "@/components/stock-table"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface StockItem {
  SKU: string
  PRODUCTO: string
  AUTOR: string
  CATEGORIA: string
  PRECIOUSD: number
  STOCK: number
  ESTANTE: number
}

export default function StockPage() {
  const [user, loading] = useAuthState(auth)
  const router = useRouter()
  const [uploadStatus, setUploadStatus] = useState<string>("")
  const [uploadedItems, setUploadedItems] = useState<number>(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (user) {
        setIsAuthenticated(true)
      } else {
        router.push("/login")
      }
    }
  }, [user, loading, router])

  const onDrop = async (acceptedFiles: File[]) => {
    if (!isAuthenticated) {
      setUploadStatus("Error: Usuario no autenticado")
      return
    }

    const file = acceptedFiles[0]
    const reader = new FileReader()

    reader.onload = async (e: ProgressEvent<FileReader>) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json<StockItem>(worksheet)

      setUploadStatus("Procesando archivo...")

      let uploadedCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (const item of json) {
        try {
          await addDoc(collection(db, "stock"), {
            sku: item.SKU || "",
            producto: item.PRODUCTO || "",
            autor: item.AUTOR || "",
            categoria: item.CATEGORIA || "",
            precioUSD: item.PRECIOUSD || 0,
            stock: item.STOCK || 0,
            estante: item.ESTANTE || 0,
          })
          uploadedCount++
        } catch (error) {
          console.error("Error al subir item:", error)
          errorCount++
          if (error instanceof Error) {
            errors.push(`Error en item ${uploadedCount + errorCount}: ${error.message}`)
          }
        }
        setUploadedItems(uploadedCount)
      }

      setUploadStatus(`Carga completada. ${uploadedCount} items subidos. ${errorCount} errores.`)
      if (errors.length > 0) {
        console.log("Errores detallados:", errors)
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!isAuthenticated) {
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
                  <BreadcrumbPage>Gestión de Stock</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="p-4">
          <Tabs defaultValue="view" className="w-full">
            <TabsList>
              <TabsTrigger value="view">Ver Stock</TabsTrigger>
              <TabsTrigger value="upload">Subir Archivo</TabsTrigger>
            </TabsList>
            <TabsContent value="view">
              <Card>
                <CardHeader>
                  <CardTitle>Inventario de Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <StockTable />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="upload">
              <Card>
                <CardHeader>
                  <CardTitle>Subir Archivo de Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    {...getRootProps()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer"
                  >
                    <input {...getInputProps()} />
                    {isDragActive ? (
                      <p>Suelta el archivo aquí ...</p>
                    ) : (
                      <p>Arrastra y suelta un archivo Excel aquí, o haz clic para seleccionar un archivo</p>
                    )}
                  </div>
                  {uploadStatus && (
                    <div className="mt-4">
                      <p>{uploadStatus}</p>
                      {uploadedItems > 0 && <p>Items subidos exitosamente: {uploadedItems}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

