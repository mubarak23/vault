import { desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import otpGenerator from 'otp-generator'

import { otp, registration } from '@/db/schema'
import { sendMessage } from '@/utils/sms'

import * as schema from '../db/schema'

interface GetOtpRequestBody {
  phone_number: string
  nickname: string
}

// OTP validity duration : 15 mins
const OTP_VALIDITY_TIME = 900

export function getOtp(fastify: FastifyInstance) {
  fastify.post<{ Body: GetOtpRequestBody }>(
    '/get_otp',

    {
      schema: {
        body: {
          type: 'object',
          required: ['phone_number', 'nickname'],
          properties: {
            phone_number: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$' },
            nickname: { type: 'string', pattern: '^[A-Za-z]{1,20}$' },
          },
        },
      },
    },

    async (request, reply) => {
      try {
        const { phone_number, nickname } = request.body

        // validating if phone number exists in db
        const record_by_phone_number = await fastify.db
          .select()
          .from(registration)
          .where(eq(registration.phone_number, phone_number))
          .orderBy(desc(registration.created_at))

        if (!record_by_phone_number.length) {
          try {
            await fastify.db.insert(schema.registration).values({
              phone_number,
              nickname,
            })
          } catch (error: any) {
            fastify.log.error(error)
            if (error.code === '23505') {
              return reply.code(409).send({
                message: 'A user with the given phone number already exists.',
              })
            }
            return reply.code(500).send({ message: 'Internal server error' })
          }
        }

        const record = await fastify.db.query.otp
          .findFirst({
            where: eq(otp.phone_number, phone_number),
            orderBy: [desc(otp.created_at)],
          })
          .execute()

        if (record) {
          //@ts-ignore
          const time_added = Date.parse(record.created_at) / 1000
          const current_time = Math.floor(Date.now() / 1000)

          // Checking if otp already requested
          // - if time_diff <= 15 mins or otp is used: deny new otp
          // - else send new otp
          if (current_time - time_added <= OTP_VALIDITY_TIME) {
            return reply.code(400).send({ message: 'You have already requested the OTP' })
          }
        }

        const otp_gen = generateOtp()

        const send_msg_res = await sendMessage(otp_gen, phone_number)
        if (!send_msg_res) {
          fastify.log.error('Error sending message to phone number')
          return reply.code(500).send({
            message: 'We are facing some issues. Please try again later',
          })
        }
        await fastify.db
          .insert(schema.otp)
          .values({
            phone_number,
            otp: otp_gen,
          })
          .onConflictDoUpdate({
            target: schema.otp.phone_number,
            set: { created_at: new Date(), otp: otp_gen },
          })

        return reply.code(200).send({ ok: true })
      } catch (error) {
        fastify.log.error(error)
        console.log(error)
        return reply.code(500).send({ message: 'Internal Server Error' })
      }
    },
  )
}

const generateOtp = (): string => {
  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  })

  return otp
}
