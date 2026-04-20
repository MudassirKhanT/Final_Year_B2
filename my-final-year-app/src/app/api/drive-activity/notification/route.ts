import { postContentToWebHook } from '@/app/(main)/(pages)/connections/_actions/discord-connection'
import { onCreateNewPageInDatabase } from '@/app/(main)/(pages)/connections/_actions/notion-connection'
import { postMessageToSlack } from '@/app/(main)/(pages)/connections/_actions/slack-connection'
import { db } from '@/lib/db'
import axios from 'axios'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  console.log('🔴 Changed')
  const headersList = headers()
  let channelResourceId: string | undefined

  headersList.forEach((value, key) => {
    if (key === 'x-goog-resource-id') {
      channelResourceId = value
    }
  })

  if (!channelResourceId) {
    return Response.json({ message: 'success' }, { status: 200 })
  }

  const user = await db.user.findFirst({
    where: { googleResourceId: channelResourceId },
    select: { clerkId: true, credits: true },
  })

  const hasCredits =
    user &&
    (user.credits === 'Unlimited' || parseInt(user.credits ?? '0') > 0)

  if (!hasCredits) {
    return Response.json({ message: 'success' }, { status: 200 })
  }

  const workflows = await db.workflows.findMany({
    where: { userId: user.clerkId },
  })

  if (!workflows.length) {
    return Response.json({ message: 'success' }, { status: 200 })
  }

  // Process each workflow sequentially to avoid concurrency issues
  for (const flow of workflows) {
    if (!flow.flowPath) continue

    const flowPath: string[] = JSON.parse(flow.flowPath)
    let didExecute = false

    for (let i = 0; i < flowPath.length; i++) {
      const step = flowPath[i]

      if (step === 'Discord') {
        const discordMessage = await db.discordWebhook.findFirst({
          where: { userId: flow.userId },
          select: { url: true },
        })
        if (discordMessage) {
          await postContentToWebHook(flow.discordTemplate!, discordMessage.url)
          didExecute = true
        }
      }

      if (step === 'Slack') {
        const channels = flow.slackChannels.map((channel) => ({
          label: '',
          value: channel,
        }))
        await postMessageToSlack(
          flow.slackAccessToken!,
          channels,
          flow.slackTemplate!
        )
        didExecute = true
      }

      if (step === 'Notion') {
        await onCreateNewPageInDatabase(
          flow.notionDbId!,
          flow.notionAccessToken!,
          JSON.parse(flow.notionTemplate!)
        )
        didExecute = true
      }

      if (step === 'Wait') {
        const res = await axios.put(
          'https://api.cron-job.org/jobs',
          {
            job: {
              url: `${process.env.NGROK_URI}?flow_id=${flow.id}`,
              enabled: 'true',
              schedule: {
                timezone: 'Europe/Istanbul',
                expiresAt: 0,
                hours: [-1],
                mdays: [-1],
                minutes: ['*****'],
                months: [-1],
                wdays: [-1],
              },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.CRON_JOB_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        )
        if (res) {
          const remainingPath = flowPath.slice(i + 1)
          await db.workflows.update({
            where: { id: flow.id },
            data: { cronPath: JSON.stringify(remainingPath) },
          })
          didExecute = true
          break
        }
      }
    }

    // Only deduct a credit if the workflow actually ran something
    if (didExecute && user.credits !== 'Unlimited') {
      await db.user.update({
        where: { clerkId: user.clerkId },
        data: { credits: `${parseInt(user.credits!) - 1}` },
      })
    }
  }

  return Response.json({ message: 'flow completed' }, { status: 200 })
}
