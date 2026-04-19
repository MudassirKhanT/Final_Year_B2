import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? 'https://localhost:3000'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/connections`)
  }

  const encoded = Buffer.from(
    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_API_SECRET}`
  ).toString('base64')

  try {
    const response = await axios('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        Authorization: `Basic ${encoded}`,
        'Notion-Version': '2022-06-28',
      },
      data: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NOTION_REDIRECT_URI!,
      }),
    })

    const notion = new Client({ auth: response.data.access_token })
    const databasesPages = await notion.search({
      filter: { value: 'database', property: 'object' },
      sort: { direction: 'ascending', timestamp: 'last_edited_time' },
    })

    const databaseId = databasesPages?.results?.length
      ? databasesPages.results[0].id
      : ''

    return NextResponse.redirect(
      `${BASE_URL}/connections?access_token=${response.data.access_token}&workspace_name=${encodeURIComponent(response.data.workspace_name ?? '')}&workspace_icon=${encodeURIComponent(response.data.workspace_icon ?? '')}&workspace_id=${response.data.workspace_id}&database_id=${databaseId}`
    )
  } catch (error) {
    console.error('Notion OAuth error:', error)
    return NextResponse.redirect(`${BASE_URL}/connections`)
  }
}
