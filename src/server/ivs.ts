import {
  CreateChannelCommand,
  DeleteChannelCommand,
  IvsClient,
  StopStreamCommand,
} from "@aws-sdk/client-ivs";

import { env } from "~/env";

const ivsClient = new IvsClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export interface IvsChannel {
  channelArn: string;
  playbackUrl: string;
  ingestEndpoint: string;
  streamKey: string;
}

export async function createIvsChannel(name: string): Promise<IvsChannel> {
  const res = await ivsClient.send(
    new CreateChannelCommand({
      name,
      latencyMode: "LOW",
      type: "STANDARD",
    })
  );

  const channelArn    = res.channel?.arn;
  const playbackUrl   = res.channel?.playbackUrl;
  const ingestEndpoint = res.channel?.ingestEndpoint;
  const streamKey     = res.streamKey?.value;

  if (!channelArn || !playbackUrl || !ingestEndpoint || !streamKey) {
    throw new Error("IVS CreateChannel returned incomplete response");
  }

  return { channelArn, playbackUrl, ingestEndpoint, streamKey };
}

export async function stopIvsStream(channelArn: string): Promise<void> {
  await ivsClient.send(new StopStreamCommand({ channelArn }));
}

export async function deleteIvsChannel(channelArn: string): Promise<void> {
  await ivsClient.send(new DeleteChannelCommand({ arn: channelArn }));
}
