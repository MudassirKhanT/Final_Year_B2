'use server'
import { Option } from '@/components/ui/multiple-selector'
import { db } from '@/lib/db'
import { auth, currentUser } from '@clerk/nextjs'

export const getGoogleListener = async () => {
  const { userId } = auth()

  if (userId) {
    const listener = await db.user.findUnique({
      where: { clerkId: userId },
      select: { googleResourceId: true },
    })
    if (listener) return listener
  }
}

export const onFlowPublish = async (workflowId: string, state: boolean) => {
  const published = await db.workflows.update({
    where: { id: workflowId },
    data: { publish: state },
  })
  return published.publish ? 'Workflow published' : 'Workflow unpublished'
}

export const onCreateNodeTemplate = async (
  content: string,
  type: string,
  workflowId: string,
  channels?: Option[],
  accessToken?: string,
  notionDbId?: string
) => {
  if (type === 'Discord') {
    const response = await db.workflows.update({
      where: { id: workflowId },
      data: { discordTemplate: content },
    })
    if (response) return 'Discord template saved'
  }

  if (type === 'Slack') {
    await db.workflows.update({
      where: { id: workflowId },
      data: { slackTemplate: content, slackAccessToken: accessToken },
    })

    const channelList = await db.workflows.findUnique({
      where: { id: workflowId },
      select: { slackChannels: true },
    })

    const incomingValues = (channels ?? []).map((c) => c.value)

    if (channelList) {
      // Remove any channels already stored to avoid duplicates, then add incoming ones
      const existing = channelList.slackChannels
      const toAdd = incomingValues.filter((v) => !existing.includes(v))

      for (const channel of toAdd) {
        await db.workflows.update({
          where: { id: workflowId },
          data: { slackChannels: { push: channel } },
        })
      }
    } else {
      for (const channel of incomingValues) {
        await db.workflows.update({
          where: { id: workflowId },
          data: { slackChannels: { push: channel } },
        })
      }
    }

    return 'Slack template saved'
  }

  if (type === 'Notion') {
    const response = await db.workflows.update({
      where: { id: workflowId },
      data: {
        notionTemplate: content,
        notionAccessToken: accessToken,
        notionDbId: notionDbId,
      },
    })
    if (response) return 'Notion template saved'
  }
}

export const onGetWorkflows = async () => {
  const user = await currentUser()
  if (user) {
    const workflow = await db.workflows.findMany({
      where: { userId: user.id },
    })
    if (workflow) return workflow
  }
}

export const onCreateWorkflow = async (name: string, description: string) => {
  const user = await currentUser()
  if (user) {
    const workflow = await db.workflows.create({
      data: { userId: user.id, name, description },
    })
    if (workflow) return { message: 'workflow created' }
    return { message: 'Oops! try again' }
  }
}

export const onGetNodesEdges = async (flowId: string) => {
  const nodesEdges = await db.workflows.findUnique({
    where: { id: flowId },
    select: { nodes: true, edges: true },
  })
  if (nodesEdges?.nodes && nodesEdges?.edges) return nodesEdges
}
