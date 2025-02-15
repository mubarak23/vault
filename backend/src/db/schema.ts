import { bigint, boolean, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

export const usdcTransfer = pgTable('transfer_usdc', {
  transferId: text('transfer_id').primaryKey(),
  network: text('network'),
  blockHash: text('block_hash'),
  blockNumber: bigint('block_number', { mode: 'number' }),
  blockTimestamp: timestamp('block_timestamp', { withTimezone: false }),
  transactionHash: text('transaction_hash'),
  fromAddress: text('from_address'),
  toAddress: text('to_address'),
  amount: text('amount'),
  createdAt: timestamp('created_at', { withTimezone: false }),
  cursor: bigint('_cursor', { mode: 'number' }),
})

export const usdcBalance = pgTable('balance_usdc', {
  network: text('network'),
  blockNumber: bigint('block_number', { mode: 'number' }),
  blockTimestamp: timestamp('block_timestamp', { withTimezone: false }),
  address: text('address'),
  balance: text('balance'),
  cursor: bigint('_cursor', { mode: 'number' }),
})

export const registration = pgTable('registration', {
  phone_number: text('phone_number').primaryKey(),
  nickname: text('nickname'),
  created_at: timestamp('created_at').defaultNow(),
  contract_address: text('contract_address').default(''),
  is_confirmed: boolean('is_confirmed').default(false),
})

export const otp = pgTable('otp', {
  phone_number: text('phone_number').primaryKey(),
  otp: text('otp'),
  used: boolean('used').default(false),
  created_at: timestamp('created_at').defaultNow(),
})

export const claims = pgTable(
  'claims',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    amount: text('amount'),
    nonce: integer('nonce'),
    address: text('address'),
    signature: text('signature').array(),
  },
  (t) => ({
    unq: unique().on(t.address, t.nonce),
  }),
)

export const mockLimit = pgTable('mock_limit', {
  address: text('address').primaryKey(),
  limit: text('limit'),
  blockTimestamp: timestamp('block_timestamp', { withTimezone: false }),
})
