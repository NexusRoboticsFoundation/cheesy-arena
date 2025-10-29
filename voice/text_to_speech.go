package voice

import (
	"context"
	"time"

	texttospeech "cloud.google.com/go/texttospeech/apiv1"
	"cloud.google.com/go/texttospeech/apiv1/texttospeechpb"
	"google.golang.org/api/option"
)

func TextToSpeech(text string, multiSpeaker bool) (*[]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	client, err := texttospeech.NewClient(ctx, option.WithCredentialsFile("nexus-fms-service-account-key.json"))
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prompt := "Say the following as a fast speaking male emcee for a robotics competition."
	voice := &texttospeechpb.VoiceSelectionParams{
			LanguageCode: "en-US",
			ModelName: "gemini-2.5-pro-tts",
			Name: "Alnilam",
		}

	if(multiSpeaker) {
		prompt = "Say the following as an energetic, very fast speaking male emcee for a robotics competition, with team details spoken by a female game announcer that sounds like a professional sports announcer. The game announcer speaks lists of sponsors incredibly quickly and doesn't say \"slash\". The emcee says two digit numbers as a single number, not individually and speaks zeros as \"oh\"."
		voice = &texttospeechpb.VoiceSelectionParams{
			LanguageCode: "en-US",
			ModelName: "gemini-2.5-pro-tts",
			MultiSpeakerVoiceConfig: &texttospeechpb.MultiSpeakerVoiceConfig{SpeakerVoiceConfigs: []*texttospeechpb.MultispeakerPrebuiltVoice{&texttospeechpb.MultispeakerPrebuiltVoice{SpeakerAlias: "Emcee", SpeakerId: "Alnilam"}, &texttospeechpb.MultispeakerPrebuiltVoice{SpeakerAlias: "GameAnnouncer", SpeakerId: "Achernar"}}},
		}
	}

	req := texttospeechpb.SynthesizeSpeechRequest{
		Input: &texttospeechpb.SynthesisInput{
			Prompt: &prompt,
			InputSource: &texttospeechpb.SynthesisInput_Text{Text: text},
		},
		Voice: voice,
		AudioConfig: &texttospeechpb.AudioConfig{
			AudioEncoding: texttospeechpb.AudioEncoding_MP3,
		},
	}

	resp, err := client.SynthesizeSpeech(ctx, &req)
	if err != nil {
		return nil, err
	}

	return &resp.AudioContent, nil
}
