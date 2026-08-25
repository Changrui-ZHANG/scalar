import { construireApp } from './app.ts'
import { chargerConfig } from './config/index.ts'

const config = chargerConfig()
const app = construireApp()

app.listen(config.PORT, () => {
  console.log(JSON.stringify({ niveau: 'info', message: 'api demarree', port: config.PORT }))
})
