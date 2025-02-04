"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { AppSidebar } from "@/components/app-sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

interface SaleData {
  date: string
  [category: string]: number | string
}

interface CategoryCount {
  category: string
  count: number
}

interface DailySales {
  date: string
  sales: number
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

const categoryColors = {
  ALFAJORES: "#FF6B6B",
  AUDIOVISUAL: "#4ECDC4",
  CAFE: "#45B7D1",
  CHOCOLATE: "#8B4513",
  COMPUTACION: "#5D5C61",
  ESCOLAR: "#7FB069",
  INGLES: "#557A95",
  JUEGOS: "#F9C80E",
  LIBRO: "#99B898",
  LIBROS: "#2A363B",
  MANGA: "#FF847C",
  VINOS: "#8E354A",
}

export default function HomePage() {
  const [user, loading] = useAuthState(auth)
  const router = useRouter()
  const [totalItems, setTotalItems] = useState<number | null>(null)
  const [totalItemsInStock, setTotalItemsInStock] = useState<number | null>(null)
  const [totalValue, setTotalValue] = useState<number | null>(null)
  const [salesData, setSalesData] = useState<DailySales[]>([])
  const [yearSales, setYearSales] = useState<number | null>(null)
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    } else if (user) {
      fetchTotalItems()
      fetchSalesData()
      fetchYearSales()
      fetchCategoryCounts()
    }
  }, [user, loading, router])

  const fetchTotalItems = async () => {
    try {
      const stockCollection = collection(db, "stock")
      const querySnapshot = await getDocs(stockCollection)
      let totalUniqueItems = 0
      let totalItemsInStock = 0
      let totalValue = 0
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const stock = Number(data.stock) || 0
        const precioUSD = Number(data.precioUSD) || 0
        totalUniqueItems++
        totalItemsInStock += stock
        totalValue += stock * precioUSD
      })
      setTotalItems(totalUniqueItems)
      setTotalItemsInStock(totalItemsInStock)
      setTotalValue(totalValue)
    } catch (error) {
      console.error("Error fetching total items and value:", error)
      setTotalItems(null)
      setTotalItemsInStock(null)
      setTotalValue(null)
    }
  }

  const fetchSalesData = async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const ventasCollection = collection(db, "ventas")
      const q = query(ventasCollection, where("date", ">=", Timestamp.fromDate(sevenDaysAgo)))
      const querySnapshot = await getDocs(q)

      const salesByDay: { [date: string]: number } = {}

      // Inicializar los últimos 7 días con ventas en 0
      for (let i = 0; i < 7; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        salesByDay[date] = 0
      }

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const date = data.date.toDate().toISOString().split("T")[0]
        salesByDay[date] = (salesByDay[date] || 0) + data.total
      })

      const formattedData: DailySales[] = Object.entries(salesByDay)
        .map(([date, sales]) => ({ date, sales }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setSalesData(formattedData)
    } catch (error) {
      console.error("Error fetching sales data:", error)
      setSalesData([])
    }
  }

  const fetchYearSales = async () => {
    try {
      const currentYear = new Date().getFullYear()
      const startOfYear = new Date(currentYear, 0, 1)
      const endOfYear = new Date(currentYear + 1, 0, 1)

      const ventasCollection = collection(db, "ventas")
      const q = query(
        ventasCollection,
        where("date", ">=", Timestamp.fromDate(startOfYear)),
        where("date", "<", Timestamp.fromDate(endOfYear)),
      )
      const querySnapshot = await getDocs(q)

      let totalSales = 0
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        totalSales += data.total || 0
      })

      setYearSales(totalSales)
    } catch (error) {
      console.error("Error fetching year sales:", error)
      setYearSales(null)
    }
  }

  const fetchCategoryCounts = async () => {
    try {
      const stockCollection = collection(db, "stock")
      const querySnapshot = await getDocs(stockCollection)
      const counts: { [category: string]: number } = {}

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const category = data.categoria
        if (category) {
          counts[category] = (counts[category] || 0) + 1
        }
      })

      const formattedCounts: CategoryCount[] = Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6) // Limitar a las 6 principales categorías

      setCategoryCounts(formattedCounts)
    } catch (error) {
      console.error("Error fetching category counts:", error)
    }
  }

  const chartConfig = categories.reduce(
    (acc, category) => {
      acc[category] = {
        label: category,
        color: categoryColors[category as keyof typeof categoryColors],
      }
      return acc
    },
    {} as { [key: string]: { label: string; color: string } },
  )

  const categoryChartConfig: ChartConfig = categoryCounts.reduce((acc, { category }) => {
    acc[category] = {
      label: category,
      color: categoryColors[category as keyof typeof categoryColors] || "#000000",
    }
    return acc
  }, {} as ChartConfig)

  const dailySalesChartConfig = {
    sales: {
      label: "Ventas",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig

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
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Artículos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalItems !== null ? totalItems : "Cargando..."}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ventas del Año</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {yearSales !== null ? `$${yearSales.toFixed(2)}` : "Cargando..."}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Items en Venta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalItemsInStock !== null ? totalItemsInStock : "Cargando..."}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total de Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalValue !== null ? `$${totalValue.toFixed(2)}` : "Cargando..."}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {salesData.length === 0 || salesData.every((day) => day.sales === 0) ? (
              <Card>
                <CardHeader>
                  <CardTitle>Ventas Diarias</CardTitle>
                  <CardDescription>Últimos 7 días</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">No hay datos de ventas para mostrar</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Ventas Diarias</CardTitle>
                  <CardDescription>Últimos 7 días</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={dailySalesChartConfig}>
                    <BarChart
                      accessibilityLayer
                      data={salesData}
                      margin={{
                        top: 20,
                        right: 20,
                        left: 20,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`
                        }}
                      />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="sales" fill="var(--color-desktop)" radius={8}>
                        <LabelList
                          dataKey="sales"
                          position="top"
                          offset={12}
                          className="fill-foreground"
                          fontSize={12}
                          formatter={(value: number) => `$${value.toFixed(2)}`}
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                  <div className="flex gap-2 font-medium leading-none">
                    {salesData.length > 0 && salesData[salesData.length - 1].sales > salesData[0].sales ? (
                      <>
                        Tendencia al alza en los últimos 7 días <TrendingUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Tendencia a la baja en los últimos 7 días <TrendingUp className="h-4 w-4 rotate-180" />
                      </>
                    )}
                  </div>
                  <div className="leading-none text-muted-foreground">
                    Mostrando ventas totales de los últimos 7 días
                  </div>
                </CardFooter>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Top 6 Categorías de Productos</CardTitle>
                <CardDescription>Distribución de las principales categorías del inventario</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={categoryChartConfig} className="h-[300px]">
                  <BarChart
                    data={categoryCounts}
                    layout="vertical"
                    margin={{
                      left: 100,
                      right: 20,
                      top: 20,
                      bottom: 5,
                    }}
                  >
                    <YAxis dataKey="category" type="category" tickLine={false} tickMargin={10} axisLine={false} />
                    <XAxis dataKey="count" type="number" hide />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="count" layout="vertical" radius={5} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">Top 6 categorías por cantidad de productos</div>
                <div className="leading-none text-muted-foreground">
                  Mostrando las 6 categorías con mayor cantidad de productos en inventario
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

