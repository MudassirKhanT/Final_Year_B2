import axios from 'axios'
import { NextResponse, NextRequest } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? 'https://localhost:3000'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/connections`)
  }

  try {
    const data = new URLSearchParams()
    data.append('client_id', process.env.DISCORD_CLIENT_ID!)
    data.append('client_secret', process.env.DISCORD_CLIENT_SECRET!)
    data.append('grant_type', 'authorization_code')
    data.append('redirect_uri', `${BASE_URL}/api/auth/callback/discord`)
    data.append('code', code)

    const output = await axios.post(
      'https://discord.com/api/oauth2/token',
      data,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    if (!output.data?.webhook) {
      return NextResponse.redirect(`${BASE_URL}/connections`)
    }

    const access = output.data.access_token
    const UserGuilds: any = await axios.get(
      'https://discord.com/api/users/@me/guilds',
      { headers: { Authorization: `Bearer ${access}` } }
    )

    const UserGuild = UserGuilds.data.filter(
      (guild: any) => guild.id === output.data.webhook.guild_id
    )

    const guildName = UserGuild[0]?.name ?? ''

    return NextResponse.redirect(
      `${BASE_URL}/connections?webhook_id=${output.data.webhook.id}&webhook_url=${encodeURIComponent(output.data.webhook.url)}&webhook_name=${encodeURIComponent(output.data.webhook.name)}&guild_id=${output.data.webhook.guild_id}&guild_name=${encodeURIComponent(guildName)}&channel_id=${output.data.webhook.channel_id}`
    )
  } catch (error) {
    console.error('Discord OAuth error:', error)
    return NextResponse.redirect(`${BASE_URL}/connections`)
  }
}
