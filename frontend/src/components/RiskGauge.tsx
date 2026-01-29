interface RiskGaugeProps {
  score: number
  label: string
  size?: 'sm' | 'lg'
}

function scoreColor(score: number): string {
  if (score < 30) return 'text-green-400'
  if (score < 50) return 'text-yellow-400'
  if (score < 70) return 'text-orange-400'
  return 'text-red-400'
}

function scoreBg(score: number): string {
  if (score < 30) return 'bg-green-400/20 border-green-400/40'
  if (score < 50) return 'bg-yellow-400/20 border-yellow-400/40'
  if (score < 70) return 'bg-orange-400/20 border-orange-400/40'
  return 'bg-red-400/20 border-red-400/40'
}

function riskLabel(score: number): string {
  if (score < 30) return 'Low'
  if (score < 50) return 'Moderate'
  if (score < 70) return 'Elevated'
  return 'High'
}

export default function RiskGauge({ score, label, size = 'lg' }: RiskGaugeProps) {
  const isLg = size === 'lg'
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${scoreBg(score)} border-2 rounded-full flex flex-col items-center justify-center ${
          isLg ? 'w-32 h-32' : 'w-20 h-20'
        }`}
      >
        <span className={`${scoreColor(score)} font-bold ${isLg ? 'text-3xl' : 'text-xl'}`}>
          {Math.round(score)}
        </span>
        <span className={`text-gray-400 ${isLg ? 'text-xs' : 'text-[10px]'}`}>
          {riskLabel(score)}
        </span>
      </div>
      <span className={`text-gray-300 font-medium ${isLg ? 'text-sm' : 'text-xs'}`}>{label}</span>
    </div>
  )
}
