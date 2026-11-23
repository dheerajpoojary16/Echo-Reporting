import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: '/EchoCare/',
  plugins: [
    react(),
    {
      name: 'echocare-apis',
      configureServer(server) {
        // Auth API: Authenticates against EchoDB.dbo.Users via python script
        const handleAuthLogin = (req: any, res: any) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, message: 'Method not allowed' }))
            return
          }

          let body = ''
          req.on('data', (chunk: any) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body || '{}')
              const username = (payload.username || '').trim()
              const password = (payload.password || '').trim()

              if (!username || !password) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, message: 'Username and password are required' }))
                return
              }

              const scriptPath = path.resolve(__dirname, 'scripts/authenticate_user.py')
              execFile('python', [scriptPath, username, password], (error, stdout, stderr) => {
                res.setHeader('Content-Type', 'application/json')
                if (error && !stdout) {
                  res.statusCode = 500
                  res.end(JSON.stringify({ success: false, message: stderr || error.message }))
                  return
                }

                try {
                  const result = JSON.parse(stdout)
                  res.statusCode = result.success ? 200 : 401
                  res.end(stdout)
                } catch {
                  res.statusCode = 500
                  res.end(JSON.stringify({ success: false, message: 'Invalid response from auth service' }))
                }
              })
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, message: 'Invalid JSON payload' }))
            }
          })
        }

        server.middlewares.use('/api/auth/login', handleAuthLogin)
        server.middlewares.use('/EchoCare/api/auth/login', handleAuthLogin)

        // Patient API: Fetches patient details via fetch_patient.py
        const handlePatientFetch = (req: any, res: any) => {
          const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
          const uhid = url.searchParams.get('uhid') || ''

          if (!uhid.trim()) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, message: 'UHID is required' }))
            return
          }

          const scriptPath = path.resolve(__dirname, 'scripts/fetch_patient.py')
          execFile('python', [scriptPath, uhid.trim()], (error, stdout, stderr) => {
            res.setHeader('Content-Type', 'application/json')
            if (error && !stdout) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, message: stderr || error.message }))
              return
            }
            res.statusCode = 200
            res.end(stdout || JSON.stringify({ success: false, message: 'Patient not found' }))
          })
        }

        server.middlewares.use('/api/patient', handlePatientFetch)
        server.middlewares.use('/EchoCare/api/patient', handlePatientFetch)
      },
    },
  ],
  server: {
    proxy: {
      '/api/clinicaldiagnoses': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false,
      },
      '/EchoCare/api/clinicaldiagnoses': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/EchoCare/, ''),
      },
      '/api/dropdown-options': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false,
      },
      '/api/dropdownoptions': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false,
      },
      '/EchoCare/api/dropdown-options': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/EchoCare/, ''),
      },
      '/EchoCare/api/dropdownoptions': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/EchoCare/, ''),
      },
      '/api/conclusion-master': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false,
      },
      '/EchoCare/api/conclusion-master': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/EchoCare/, ''),
      },
      '/api/doctors': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false,
      },
      '/EchoCare/api/doctors': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/EchoCare/, ''),
      },
    },
  },
})
