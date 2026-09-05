import { AccessToken } from "livekit-server-sdk";
import dotenv from "dotenv";
dotenv.config();

// const identity = "user_identity"; 
// const roomName = "room_name"; 
const agentName = "agent_name"; 

const createLiveKitToken = async (): Promise<{ serverUrl: string, participantToken: string }> => {
    
    // livekit config variables 
    const identity = `user_${Math.floor(Math.random() * 10000)}`;
    const roomName = `room_${Math.floor(Math.random() * 10000)}`;    

    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    
    const token = new AccessToken(apiKey, apiSecret, { identity, name: identity, ttl: "10m", });
    
    token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true, }); 
    // Tell LiveKit which agent should be dispatched 
    // token.agentName = agentName;
    const jwt = await token.toJwt(); 
    
    return { serverUrl: process.env.LIVEKIT_URL || '', participantToken: jwt }
}

export default createLiveKitToken;
