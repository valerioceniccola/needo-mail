import content from '@/content.json'

// larghezze fisse (non casuali) così lo scheletro non cambia a ogni render
const ROWS = [
  [26, 48],
  [18, 62],
  [30, 40],
  [22, 55],
  [16, 46],
  [28, 58],
  [20, 36],
  [24, 50],
  [18, 44],
  [26, 60],
  [22, 38],
  [30, 52]
]
const NAV = [70, 54, 62, 48, 58]

/** Sagoma molto semplificata di Gmail (barra in alto, menu a sinistra, elenco email) mostrata mentre carica. */
export default function GmailSkeleton() {
  return (
    <div className="absolute inset-0 flex animate-pulse flex-col" role="status" aria-label={content.gmail.loading}>
      {/* barra in alto: menu, logo, ricerca, icone */}
      <div className="flex h-16 shrink-0 items-center gap-4 px-4">
        <span className="size-6 rounded-full bg-[#e3e6ec]" />
        <span className="h-6 w-[100px] rounded-md bg-[#e3e6ec]" />
        <span className="ml-[52px] h-12 max-w-[720px] flex-1 rounded-full bg-[#e9edf4]" />
        <span className="ml-auto flex gap-3">
          <span className="size-8 rounded-full bg-[#e3e6ec]" />
          <span className="size-8 rounded-full bg-[#e3e6ec]" />
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* menu a sinistra: Scrivi + cartelle */}
        <div className="flex w-[240px] shrink-0 flex-col gap-4 px-3 pt-2 max-[900px]:hidden">
          <span className="mb-2 h-14 w-[140px] rounded-2xl bg-[#e3e6ec]" />
          {NAV.map((w, i) => (
            <span key={i} className="ml-4 flex items-center gap-4">
              <span className="size-5 rounded bg-[#e3e6ec]" />
              <span className="h-3 rounded bg-[#e3e6ec]" style={{ width: `${w}%` }} />
            </span>
          ))}
        </div>

        {/* elenco email */}
        <div className="mr-4 mb-4 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white max-[900px]:ml-4">
          <div className="flex h-12 shrink-0 items-center gap-5 px-5">
            <span className="size-[18px] rounded-[3px] bg-[#e9edf4]" />
            <span className="size-[18px] rounded-full bg-[#e9edf4]" />
            <span className="size-[18px] rounded-full bg-[#e9edf4]" />
          </div>
          {ROWS.map(([sender, subject], i) => (
            <div key={i} className="flex h-10 shrink-0 items-center gap-5 border-t border-[#f1f3f4] px-5">
              <span className="size-[18px] shrink-0 rounded-[3px] bg-[#eef1f5]" />
              <span className="h-3 shrink-0 rounded bg-[#e9edf4]" style={{ width: `${sender * 0.6}%`, maxWidth: 180 }} />
              <span className="h-3 rounded bg-[#eef1f5]" style={{ width: `${subject}%` }} />
              <span className="ml-auto h-3 w-10 shrink-0 rounded bg-[#eef1f5]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
