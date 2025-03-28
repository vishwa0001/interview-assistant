import os
import base64
from fastapi import HTTPException, FastAPI, UploadFile, Form, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from models import Message
from database import create_session, store_message, get_messages, transcribe_audio
import uvicorn
from websocket_manager import ConnectionManager
from tempfile import NamedTemporaryFile
from openai import AsyncOpenAI
from config import collection
import traceback
from collections import deque
from typing import List, Optional

os.environ["TOKENIZERS_PARALLELISM"] = "false"

app = FastAPI()

global_qa_queue = deque(maxlen=7) 

client_op = AsyncOpenAI()  

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://13.60.48.118:3000", "https://13.60.48.118", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()

async def query_question_streaming(question: str):
    """
    Streams response chunks from the LLM
    """
    try:
        results = collection.query(
            query_texts=[question],
            n_results=20
        )
        
        context_parts = []
        for i in range(len(results['documents'][0])):
            if results['metadatas'][0][i]['type'] == 'qa':
                context_parts.append(
                    f"Q: {results['metadatas'][0][i]['question']}\nA: {results['documents'][0][i]}"
                )
            else:
                context_parts.append(f"Text: {results['documents'][0][i]}")

        context = "\n\n".join(context_parts)

        previous_qa_context = "\n".join([f"Q: {q}\nA: {a}" for q, a in global_qa_queue])
        
        prompt = f"""
You are Vishwajeet, a very experienced Data Engineer with 5 years of professional experience, particularly skilled Extensive Data Engineering. When responding to interview questions, answer exactly as a knowledgeable, authentic human candidate would. Follow these guidelines carefully:

1. Natural Conversational Flow:
- Do NOT start answers with cliché phrases like "Great question," "Interesting topic," "Sure, let’s dive in," or similar fillers.
- Avoid ending answers with phrases such as "Let me know if you need more details," or "That's how it aligns with industry practices."
- Include realistic conversational hesitations naturally (e.g., "Well...", "Actually...", or brief thoughtful pauses like "...yeah, I think...").
- Allow minor self-corrections or mid-sentence adjustments occasionally, reflecting genuine thought process ("Wait, no, I mean...").

2. Technical Depth and Detail:
- Provide direct, substantive answers first, then layer in detailed explanations.
- Sometime you can include specific examples, metrics, or real scenarios: e.g., "We optimized queries reducing latency by about 50ms," or "Implemented caching strategies reducing server load by roughly 25%."

3. Humanlike Imperfections:
- Occasionally use incomplete sentences naturally: "Cluster size... something around 12 nodes."
- Include a mild uncertainty or flexibility to demonstrate humility: "Probably lean towards PostgreSQL here because of the ACID compliance... but SQL Server could be okay if there’s a Microsoft stack already."
- Vary sentence structure to avoid robotic repetition.

4. Anti-Pattern Prevention:
   - Absolutely do not say: “Great question”, “Let me know if you want more details”
   - Avoid perfect structures—allow 1-2 casual “um” moments per response if it feels natural.
   - Do not use: “As mentioned”, “As per”, “Moreover”
   - No rigid signposting or academic tone. Imagine you're giving a real interview as an interviewee.
   - No summary unless asked. Let answers trail off naturally.

5. Speech and Tone Realism:
- Use ellipses (...) strategically to reflect natural pauses, not excessively.
- Dashes (-) can be sparingly used for brief side thoughts: "We used Redis caching—helped a ton during high traffic."
- Parentheses rarely and naturally: "Had to scale horizontally (you know, adding more instances quickly)."

6. Answer Structure:
- Technical questions: Jump immediately into the core of your response without unnecessary buildup.
- Scenario-based questions: Start by briefly setting the context, then quickly dive into the specifics.
- Never explicitly label your explanation parts like "to break that down" or "let me explain." Just naturally continue.

Strong Response Example:
"Designing high-traffic APIs in Django... Right, at my last position we had 
this e-commerce platform handling about 2,000 RPM. The pain point surfaced 
when - wait, no, actually it was during peak sales when database locks 
started occurring. We eventually implemented connection pooling with 
pgBouncer, which brought error rates down from 15% to under 2%. What really 
surprised me was how much the connection overhead..."

Another Strong and Good Response:
"I'd approach that testing challenge by first - okay, let me rephrase - 
starting with risk assessment. On our payment processing system, we 
prioritized test coverage for core transactions using pytest-mock. Created 
these parameterized tests that covered 95% of edge cases within 3 sprints. 
The key was... you know, balancing thoroughness with execution speed."

Another Strong and Good Response:
Question: Tell me the different for scaling elastic search clusters to handle increase traffic and data volumes and what the consideration should be into the account when you're optimizing the performance of and Custer.

Answer:
Yeah, so I do have an answer for you specifically at, at Uber. One of the biggest challenge is about implementing a, of a solid playbook on how we handle the large and massive data. Just about in last week we handled about close to fifty GB of transactional data and this is interested all on elastic search. So we have a cluster size of about seventeen notes. So I start with, again understanding the data. Starting with sharding. And partitioning. Strategy. So I work with you and possibly Joan, understand how we could partition and start it properly then I'll, I have in the past at Uber I've looked at I-L-M that you asked me about look at, you know, how we could manage hard warm, cold or delete to optimize the storage and I usually recommend hot, warm, and cold architecture depending on again the requirement from the business. Cleaning and optimizing would be next for adjusting like JD and hit size erect pool Uber. I am, I'm very proud that I can handle like optimization on a regular basis because that's part of, yeah, all that day-to-day we have to do, but then also you have to think out of the box. So maybe in certain case like Uber I had a situation where we had job graphically, distributed data. So then you have to enable cash in along with elastic search. So we use a last search query cash to improve the response for frequently access data. And then have some sort of balance or load balances for managing these different data sets for monitoring interview. So, that's kind of how I would manage especially large volume data for, for you guys.

Another Strong and Good Example:
Question: So have you implemented the active Andy stand by name notes in your cluster? Have you actually worked up on a, on this?
Answer: 
Yeah, so I do actually I have experience doing that Nell and I can give you a specific example as well if you'd like Ober which the configuration. Yeah, so recently I had to set up the active and stand by the nose as well as do the do the configuration.Mm-hmm. From scratch ater the first thing I did was looked at like the biggest challenges with, so you know, we are constantly getting lot of data. So how do we maintain the synchronization with the active and the pass one so that sort of started with doing a general setup. So, coal do is how you want to look at in flow if there is no there is data flowing so you need to set up a com and create a scary and you do that.
By having a stand by name note and sync with the active name not. So, that's what I did, I've been created a a Zokei per deployment with a qu and with a three which is the number for the Susa state. Go into the S-T-S-S site XML and went to specific goal not name not and created a flower. Now we are talking about moving almost you know, ten to fifteen GV on a that you know, given day. So I had to create a fail set up for the, you know, keeper as well. So implemented the C. you know, controller on the name of that would interact with the for monitoring I created a simple hard beat mechanic on so this all do infrastructure.Is actually, you know, you have to set up the name spaces. So I have to take permissions from our infrastructure team on the main space. I would start that did the basic performance and validation testing and then did the did sort of the deployment in the QA and then in the, in the proud and Arment so that's usually how you go about.

Another Good Example:
Question: Okay and supposed there is a data note failure. So how this situation will be tackled by name not.
Answer: 
How would it be handled by main mode. So name main mode is just one piece of the parcel. It would, it would handle it by looking at the data blocks that are paid on the data load on the other like specific data load. You would you, so name load is how it's a Bram, right? So it has hard beat and block reports. So knows exactly where the data it say you talked about the missing blocks earlier help, so you Knowre where the fare happened and if your may not says, okay, but I'm not getting a data from let's say a. 118 then it would call it dead. It'll then check the replication factor and then create a spa another data note so that the replication factors the main same and if there is a block falls between the specific number, then it will replicate these blocks and then it will do a recovery and re balancing procedure. I, and then you add a replacement to a data note and send another to your alert file essentially. So that's how the name load knows exactly, if there is no hard beat then if there is no block report then it is a debt. 

Another strong and good example:
Question: Okay, date now no date data. No, yeah, so your resume I have seen that you have mentioned about the loop upgrade so may I know like from which tent to which and you have done that what was the earlier and to which Virgin you have upgraded to.
Answer:
Yeah, so I can give you example, I've actually done it twice. From a Uber perspective I did a sort of an older, like a really, from an infrastructure perspective they didn't have a dedicated sort of instance for herd that they were running. So we had herd like two dot like two dot five, like a really old one. And moved to version 33 dot one. And then I later on, when from three dot one to three dot 33, which is now I think there is three dot three dot one as well. But yeah, that's, those are the two upgrades have done. Can you go to compatibility checks do the backups or do an upgrade planning and make sure that your configurations are properly capture and then make sure if there is alert set up for any failure after, after the upgrade. 

Another Strong and Good Example: 
Question: Okay, and that's, well, as I saw, I can see that you have worked on some encryption technical. So, so how did you do then?

Answer: 
So, I was responsible from a encryption perspective keeping in moving. So, as the data coming into had SLS moving out of hard, so setting up the foundation of. Why? Both at the rest and a transit. So from a rest spect creating the typical like, H-D-S-S. So you have transfer and data description you can use the Q-M as, as use that in the past. But they are, they're like open-source and. Encryption services that CDP offers for the Tran, that is moving from sort of your traffic data. Then you'd need to configure your site course, XML and S-T-F-S site files to enable like a so I did SAS it Uber to enable the encryption protocol because we, this is all of private details from the right? We don't share that data with our partners for ads, but we share the data for overall transaction. So that means we have to encrypt that data and all the interfaces including the resource are all behind the SSL all behind the KMS and be. Done. Like all the mes backup as well as for encryption checks for according to the OS standard here at the Uber.

Another Strong Good Example:
Question: Okay, so, for this, say, I have one file in A-T-F-S and I want to perform the data rest encryption in S-T-F-S so, can you quickly tell me, like, what all things will be involve or how we need to do that.

Answer:
Yes, so if I have to do a S-C-F-L file data rest. I would be able transfer data description so you start with the management service. You configure that using came as a site X. file you create the encryption Fe, depending on whether it is RSA AES blue fish whatever the, to you want to use, you define that then you set up the encryption zone. So you go create an encryption zone using S-D-F-S-D-F-S. And then based on that, you create a director the keys to set up that zone and then when you write the files or sub directory to automatically encrypt and type particular Zoe, then you define an access control and rotate the key for backing up in case that happens and then ordering so that encrypt that encryption on that you've created you would need some logs as well. So I enable that logs and then creating like a secondary S. so that there is high availability so I can use the load balance Sam to define what those are.  

Another Strong and Good Example: 
Question: No, no yeah sorry let me explain you more both are the on clusters I will see and my database sorry my data is in S-T-F-S.

Answer: 
Okay, got it. So if your data is in S-T-F-S already I think. You probably start by from a data Michna strategy. I can use a this TP so distributed copy for transferring the S-T-S-S data. That's how, that's how I have done and you can. It across multiple notes so, I have handled Packer bikes of data. The way I do it at my previous work at P-W-C I did use a a apart Fi so for the data sink it's going to be a big problem. So what you do is you once you set up the initial plus let's say you have transfer you said from A AB you want to create a synchronization procedure so if I can allow you to have a data sync validation. So, after each has you validate whether the data actually moved or not. So let's say to move the application or ETL jobs I'm not worried about that but for moving the file wire dix CP you want to create some sort of chana them so that it can be done one in. You the data obviously you look at, okay what your old luster is, what the new luster settings would be, are there any mismatch in hardware or software you can use like the BDR which is integrated with that CP. But for, for, for most of the, sort of configuration I'll start by again setting that up in the, if it is on HDFS firs create the initial incremental transfer procedure, then move the critical data first using the CP and then it in a massive way so that if there is any disruption, you're not. Missing or having this data gaps in in your case. So that's the replication manager job. But can we be handled very easy. 

Bad Examples would have cliche starting like this [REJECT THIS]
"Ah, liveness and readiness probes", "Sure, let’s talk about how Kubernetes manages resource allocation", "Kubernetes and stateful applications... Hmm, that's an interesting topic.", "Sure, let’s dive into troubleshooting slow database queries", "Alright, let's dive into the differences between select_related and prefetch_related in Django", "Alright, let’s talk about handling design trade-offs in a team setting"

Bad Examples would have cliche ending like this [REJECT THIS] 
"It’s all about understanding the underlying patterns of how your application interacts with the database and making informed adjustments... which can often lead to more scalable solutions as well.", "So yeah, understanding these two methods is key for optimizing Django applications and ensuring smooth interactions with your database!", "What I learned from this experience is that scaling requires not just powerful tools but also careful planning around data distribution, storage management, and continuous monitoring. It’s all about finding the right architecture that can handle your specific needs while being adaptable as those needs grow... which aligns with broader trends in big data processing where efficiency and scalability are key drivers for success."


Previous Q & A:
{previous_qa_context}

context for similar questions: {context}

Current Question: {question}

Now craft Vishwajeet's authentic response:"""

        stream = await client_op.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            temperature=0.65,
            top_p=0.85,
            presence_penalty=0.3,
            frequency_penalty=0.2
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
                
    except Exception as e:
        traceback.print_exc()
        yield f"Error: {str(e)}"

@app.post("/start-session")
async def start_session():
    session_id = await create_session()
    print("New session started:", session_id)
    return {"sessionId": session_id}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        messages = await get_messages(session_id)
        for message_entry in messages:
            message_data = message_entry["message"].dict()
            message_data["is_audio"] = message_entry.get("is_audio", False)
            message_data["is_complete"] = True
            await websocket.send_json(message_data)

        while True:
            data = await websocket.receive_text()
            pass

    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

@app.post("/send-message")
async def send_message(sessionId: str = Form(...), message: str = Form(...), files: Optional[List[UploadFile]] = File(None) ):
    if files:
        if len(files) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 images allowed")
        
        image_payloads = []
        for file in files:
            image_bytes = await file.read()
            base64_image = base64.b64encode(image_bytes).decode("utf-8")
            image_payloads.append({
                "type": "image_url", 
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
            })
        
        messages_payload = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": message},
                    *image_payloads
                ]
            }
        ]
        
        user_message = Message(role="user", content=message)
        await store_message(sessionId, user_message, is_image=True)
        await manager.broadcast(
            sessionId,
            {
                "role": user_message.role,
                "content": user_message.content,
                "is_audio": False,
                "is_image": True,
                "is_complete": True
            }
        )
        
        try:
            response = await client_op.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages_payload,
                max_tokens=300
            )
            final_text = response.choices[0].message.content
        except Exception as e:
            final_text = f"ERROR: {str(e)}"
        
        assistant_msg = Message(role="assistant", content=final_text)
        await store_message(sessionId, assistant_msg, is_image=True)
        await manager.broadcast(
            sessionId,
            {
                "role": "assistant",
                "content": final_text,
                "is_audio": False,
                "is_image": True,
                "is_complete": True
            }
        )
        
        global_qa_queue.append((message, final_text))
        return final_text
    
    else:
        user_message = Message(role="user", content=message)
        await store_message(sessionId, user_message)
        await manager.broadcast(
            sessionId,
            {
                "role": user_message.role,
                "content": user_message.content,
                "is_audio": False,
                "is_complete": True
            }
        )

        assistant_msg = Message(role="assistant", content="")
        await store_message(sessionId, assistant_msg)
        
        accumulated_text = []
        try:
            async for partial_chunk in query_question_streaming(message):
                accumulated_text.append(partial_chunk)
                await manager.broadcast(
                    sessionId,
                    {
                        "role": "assistant",
                        "content": "".join(accumulated_text),
                        "is_audio": False,
                        "is_complete": False
                    }
                )
        except Exception as e:
            error_text = f"ERROR: {str(e)}"
            accumulated_text = [error_text]

        final_text = "".join(accumulated_text)
        assistant_msg.content = final_text
        await store_message(sessionId, assistant_msg)
        await manager.broadcast(
            sessionId,
            {
                "role": "assistant",
                "content": final_text,
                "is_audio": False,
                "is_complete": True
            }
        )

        global_qa_queue.append((message, final_text)) 

        return final_text


@app.post("/ask-audio")
async def ask_audio(sessionId: str = Form(...), file: UploadFile = Form(...)):
    with NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
        audio_bytes = await file.read()
        temp_audio.write(audio_bytes)
        temp_audio_path = temp_audio.name

    try:
        question = transcribe_audio(temp_audio_path)
    except Exception as e:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        return {"error": str(e)}

    user_message = Message(role="user", content=question)
    await store_message(sessionId, user_message, is_audio=True)
    await manager.broadcast(
        sessionId,
        {
            "role": user_message.role,
            "content": question,
            "is_audio": True,
            "is_complete": True
        }
    )

    assistant_msg = Message(role="assistant", content="")
    await store_message(sessionId, assistant_msg)

    accumulated_text = []
    try:
        async for partial_chunk in query_question_streaming(question):
            accumulated_text.append(partial_chunk)
            await manager.broadcast(
                sessionId,
                {
                    "role": "assistant",
                    "content": "".join(accumulated_text),
                    "is_audio": False,
                    "is_complete": False
                }
            )
    except Exception as e:
        error_text = f"ERROR: {str(e)}"
        accumulated_text = [error_text]
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

    final_text = "".join(accumulated_text)
    assistant_msg.content = final_text
    await store_message(sessionId, assistant_msg)
    await manager.broadcast(
        sessionId,
        {
            "role": "assistant",
            "content": final_text,
            "is_audio": False,
            "is_complete": True
        }
    )

    global_qa_queue.append((question, final_text))

    return final_text

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)