import { describe, test, expect } from 'vitest'
import { validateSql } from '../sql-guard'

const DA_ROLES = ['DA']
const DE_ROLES = ['DE']

describe('validateSql — role DA (read-only)', () => {
  test('SELECT bình thường → cho phép', () => {
    expect(validateSql('SELECT 1', DA_ROLES).allowed).toBe(true)
  })

  test('DROP TABLE → chặn', () => {
    expect(validateSql('DROP TABLE users', DA_ROLES).allowed).toBe(false)
  })

  test('Comment trước DROP → chặn', () => {
    expect(validateSql('/* hack */ DROP TABLE users', DA_ROLES).allowed).toBe(false)
  })

  test('Line comment trước DELETE → chặn', () => {
    expect(validateSql('-- trick\nDELETE FROM users', DA_ROLES).allowed).toBe(false)
  })

  test('WITH...SELECT → cho phép', () => {
    const sql = 'WITH cte AS (SELECT id FROM users) SELECT * FROM cte'
    expect(validateSql(sql, DA_ROLES).allowed).toBe(true)
  })

  test('WITH...DELETE (CTE bypass) → chặn', () => {
    const sql =
      'WITH cte AS (SELECT id FROM users) DELETE FROM users WHERE id IN (SELECT id FROM cte)'
    expect(validateSql(sql, DA_ROLES).allowed).toBe(false)
  })

  test('INSERT → chặn', () => {
    expect(validateSql("INSERT INTO users VALUES (1, 'x')", DA_ROLES).allowed).toBe(false)
  })

  test('SHOW TABLES → cho phép', () => {
    expect(validateSql('SHOW TABLES', DA_ROLES).allowed).toBe(true)
  })

  test('DESCRIBE table → cho phép', () => {
    expect(validateSql('DESCRIBE users', DA_ROLES).allowed).toBe(true)
  })
})

describe('validateSql — role DE (write allowed)', () => {
  test('DROP TABLE → cho phép', () => {
    expect(validateSql('DROP TABLE users', DE_ROLES).allowed).toBe(true)
  })

  test('INSERT → cho phép', () => {
    expect(validateSql('INSERT INTO t VALUES (1)', DE_ROLES).allowed).toBe(true)
  })
})
