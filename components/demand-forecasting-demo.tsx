"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DemandForecastChart } from "@/components/demand-forecast-chart"
import { SimpleChartView } from "@/components/simple-chart-view"
import { TestResultsCard } from "@/components/test-results-card"
import { ModelInfoCard } from "@/components/model-info-card"
import {
  generateHistoricalData,
  generateForecastData,
  testForecastAccuracy,
  normalizeTimeSeriesData,
} from "@/lib/forecast-utils"
import { DataImportDialog } from "@/components/data-import-dialog"
import { Download, Upload, AlertTriangle, RefreshCw, BarChart3, Table } from "lucide-react"
import type { DataPoint } from "@/lib/types"
import { DataDebug } from "@/components/data-debug"
import { SampleDataButton } from "@/components/sample-data-button"
import { DataTable } from "@/components/data-table"

export function DemandForecastingDemo() {
  const [historicalData, setHistoricalData] = useState<DataPoint[]>(() => {
    // Generate initial data
    const data = generateHistoricalData(24)
    console.log("Initial historical data:", data)
    return data
  })

  const [forecastData, setForecastData] = useState<DataPoint[]>(() => {
    // Generate initial forecast
    const data = generateForecastData(generateHistoricalData(24), 12)
    console.log("Initial forecast data:", data)
    return data
  })

  const [testPeriods, setTestPeriods] = useState(6)
  const [seasonalityFactor, setSeasonalityFactor] = useState(20)
  const [trendFactor, setTrendFactor] = useState(5)
  const [noiseFactor, setNoiseFactor] = useState(10)
  const [testResults, setTestResults] = useState<null | {
    mape: number
    rmse: number
    accuracy: number
  }>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [dataState, setDataState] = useState<"initial" | "loading" | "success" | "error">("initial")
  const [viewMode, setViewMode] = useState<"chart" | "simple" | "table">("chart")

  // Effect to update forecast when historical data changes
  useEffect(() => {
    if (historicalData && historicalData.length > 0) {
      try {
        const newForecast = generateForecastData(historicalData, 12)
        console.log("Generated forecast:", newForecast)
        setForecastData(newForecast)
      } catch (err) {
        console.error("Error generating forecast:", err)
      }
    }
  }, [historicalData])

  const handleGenerateNewData = () => {
    setDataState("loading")

    try {
      const newHistoricalData = generateHistoricalData(24)
      console.log("Generated new historical data:", newHistoricalData)

      setHistoricalData(newHistoricalData)
      setTestResults(null)
      setImportError(null)
      setDataState("success")
    } catch (err) {
      console.error("Error generating new data:", err)
      setImportError(`Error generating data: ${err instanceof Error ? err.message : "Unknown error"}`)
      setDataState("error")
    }
  }

  const handleTestForecast = () => {
    setIsLoading(true)

    // Simulate API call to test the model
    setTimeout(() => {
      try {
        const results = testForecastAccuracy(historicalData, forecastData, testPeriods, {
          seasonality: seasonalityFactor,
          trend: trendFactor,
          noise: noiseFactor,
        })
        setTestResults(results)
        setIsLoading(false)
      } catch (err) {
        console.error("Error testing forecast:", err)
        setImportError(`Error testing forecast: ${err instanceof Error ? err.message : "Unknown error"}`)
        setIsLoading(false)
      }
    }, 1500)
  }

  const handleDataImported = (importedData: DataPoint[]) => {
    console.log("Received imported data:", importedData)
    setImportError(null)
    setDataState("loading")

    if (!importedData || importedData.length === 0) {
      setImportError("No valid data received from import")
      setDataState("error")
      return
    }

    try {
      // Normalize the data to ensure regular monthly intervals
      const normalized = normalizeTimeSeriesData(importedData)
      console.log("Normalized data:", normalized)

      if (!normalized || normalized.length === 0) {
        setImportError("Normalization resulted in empty dataset")
        setDataState("error")
        return
      }

      // Update historical data
      setHistoricalData(normalized)

      // Reset test results
      setTestResults(null)
      setDataState("success")
    } catch (err) {
      console.error("Error processing imported data:", err)
      setImportError(`Error processing data: ${err instanceof Error ? err.message : "Unknown error"}`)
      setDataState("error")
    }
  }

  const handleExportData = () => {
    const combinedData = [
      ...historicalData.map((point) => ({
        date: new Date(point.date).toISOString().split("T")[0],
        actual: point.actual,
        forecast: null,
      })),
      ...forecastData.map((point) => ({
        date: new Date(point.date).toISOString().split("T")[0],
        actual: null,
        forecast: point.forecast,
      })),
    ]

    // Create CSV content
    const headers = ["date", "actual", "forecast"]
    const csvContent = [
      headers.join(","),
      ...combinedData.map((row) => headers.map((header) => row[header as keyof typeof row] ?? "").join(",")),
    ].join("\n")

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "demand_forecast_data.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Demand Forecast Visualization</CardTitle>
              <CardDescription>Historical data and forecasted demand for the next 12 months</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <SampleDataButton />
              <div className="border rounded-md overflow-hidden">
                <Tabs defaultValue={viewMode} value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                  <TabsList className="grid grid-cols-3 h-8">
                    <TabsTrigger value="chart">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Chart
                    </TabsTrigger>
                    <TabsTrigger value="simple">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Simple
                    </TabsTrigger>
                    <TabsTrigger value="table">
                      <Table className="h-4 w-4 mr-1" />
                      Table
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {importError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          {dataState === "loading" ? (
            <div className="w-full aspect-[4/3] sm:aspect-[16/9] flex items-center justify-center border rounded-md bg-muted/20">
              <div className="flex flex-col items-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading data...</p>
              </div>
            </div>
          ) : viewMode === "chart" ? (
            <DemandForecastChart historicalData={historicalData} forecastData={forecastData} />
          ) : viewMode === "simple" ? (
            <SimpleChartView historicalData={historicalData} forecastData={forecastData} />
          ) : (
            <DataTable historicalData={historicalData} forecastData={forecastData} />
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            <p>
              Having trouble with the visualization? Try switching to the Simple view or Table view using the buttons
              above.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div>
            <Button onClick={handleGenerateNewData} variant="outline" className="mr-2">
              Generate New Data
            </Button>
            <Button onClick={handleTestForecast} disabled={isLoading || dataState === "loading"}>
              {isLoading ? "Testing..." : "Test Forecast Accuracy"}
            </Button>
          </div>
          <div>
            <Button
              onClick={() => setIsImportDialogOpen(true)}
              variant="outline"
              className="mr-2"
              title="Import your own data"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button onClick={handleExportData} variant="outline" title="Export data as CSV">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="grid gap-6">
        <ModelInfoCard />

        <Card>
          <CardHeader>
            <CardTitle>Test Parameters</CardTitle>
            <CardDescription>Adjust parameters to simulate different future scenarios</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="test-periods">Test Periods</Label>
                <span className="text-sm text-muted-foreground">{testPeriods} months</span>
              </div>
              <Slider
                id="test-periods"
                min={1}
                max={12}
                step={1}
                value={[testPeriods]}
                onValueChange={(value) => setTestPeriods(value[0])}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="seasonality">Seasonality Factor</Label>
                <span className="text-sm text-muted-foreground">{seasonalityFactor}%</span>
              </div>
              <Slider
                id="seasonality"
                min={0}
                max={50}
                step={1}
                value={[seasonalityFactor]}
                onValueChange={(value) => setSeasonalityFactor(value[0])}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="trend">Trend Factor</Label>
                <span className="text-sm text-muted-foreground">{trendFactor}%</span>
              </div>
              <Slider
                id="trend"
                min={-20}
                max={20}
                step={1}
                value={[trendFactor]}
                onValueChange={(value) => setTrendFactor(value[0])}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="noise">Noise Factor</Label>
                <span className="text-sm text-muted-foreground">{noiseFactor}%</span>
              </div>
              <Slider
                id="noise"
                min={0}
                max={30}
                step={1}
                value={[noiseFactor]}
                onValueChange={(value) => setNoiseFactor(value[0])}
              />
            </div>
          </CardContent>
        </Card>

        {testResults && <TestResultsCard results={testResults} />}
      </div>
      <DataImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onDataImported={handleDataImported}
      />
      <DataDebug historicalData={historicalData} forecastData={forecastData} />
    </div>
  )
}
