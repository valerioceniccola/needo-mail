// file importati con ?asset: electron-vite li copia nella build e restituisce il percorso
declare module '*?asset' {
  const path: string
  export default path
}
