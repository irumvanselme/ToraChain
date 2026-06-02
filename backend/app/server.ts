import { Elysia } from 'elysia'

new Elysia().get('/', () => 'Hello World! from backend').listen(3000)
