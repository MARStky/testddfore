import { DemandForecastingDemo } from "@/components/demand-forecasting-demo"
import { FileFormatGuide } from "@/components/file-format-guide"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Retail Demand Forecasting</h1>
          <p className="mt-4 text-lg text-gray-600">Powered by Amazon SageMaker Autopilot</p>
        </div>
        <DemandForecastingDemo />
        <div className="mt-8">
          <FileFormatGuide />
        </div>
      </div>
    </main>
  )
}
