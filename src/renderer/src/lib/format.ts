import dayjs from 'dayjs'
import 'dayjs/locale/it'

dayjs.locale('it')

/** "alle 18:00" se è oggi, altrimenti "lunedì alle 9:00". */
export function formatWhen(date: Date, now: Date): string {
  const d = dayjs(date)
  return d.isSame(now, 'day') ? d.format('[alle] H:mm') : d.format('dddd [alle] H:mm')
}
