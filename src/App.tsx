import styles from './App.module.css'

export function App() {
  return (
    <main className={styles.shell}>
      <h1>Frontend Reliability Lab</h1>
      <p className={styles.subtitle}>
        Observe how a React frontend behaves under real API and network failures.
      </p>
    </main>
  )
}
