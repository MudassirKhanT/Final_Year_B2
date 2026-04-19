import { google } from 'googleapis'
import { auth, clerkClient } from '@clerk/nextjs'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const clerkResponse = await clerkClient.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    )

    const tokenData = Array.isArray(clerkResponse)
      ? clerkResponse
      : (clerkResponse as any).data ?? []

    if (!tokenData.length || !tokenData[0]?.token) {
      return NextResponse.json(
        { message: 'No Google OAuth token. Please re-authenticate with Google.' },
        { status: 400 }
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.OAUTH2_REDIRECT_URI
    )
    oauth2Client.setCredentials({ access_token: tokenData[0].token })

    const drive = google.drive({ version: 'v3', auth: oauth2Client })
    const response = await drive.files.list()

    return Response.json({ message: response.data }, { status: 200 })
  } catch (error: any) {
    console.error('Drive files list error:', error)
    return Response.json(
      { message: error.message ?? 'Something went wrong' },
      { status: 500 }
    )
  }
}
