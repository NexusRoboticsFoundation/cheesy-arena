package voice

import (
	"context"
	"os"

	texttospeech "cloud.google.com/go/texttospeech/apiv1"
	"cloud.google.com/go/texttospeech/apiv1/texttospeechpb"
	"google.golang.org/api/option"
)

func TextToSpeech(text string) (*[]byte, error) {
	ctx := context.Background()

	client, err := texttospeech.NewClient(ctx, option.WithAPIKey(os.Getenv("TTS_API_KEY")))
	if err != nil {
		return nil, err
	}
	defer client.Close()

	var prompt = "Say the following as an energetic, very fast speaking male emcee for a robotics competition, with team details spoken by a female game announcer that sounds like a professional sports announcer. The game announcer speaks lists of sponsors incredibly quickly and doesn't say \"slash\"."
	req := texttospeechpb.SynthesizeSpeechRequest{
		Input: &texttospeechpb.SynthesisInput{
			Prompt: &prompt,
			InputSource: &texttospeechpb.SynthesisInput_Text{Text: text},
		},
		Voice: &texttospeechpb.VoiceSelectionParams{
			LanguageCode: "en-US",
			ModelName: "gemini-2.5-flash-tts",
			MultiSpeakerVoiceConfig: &texttospeechpb.MultiSpeakerVoiceConfig{SpeakerVoiceConfigs: []*texttospeechpb.MultispeakerPrebuiltVoice{&texttospeechpb.MultispeakerPrebuiltVoice{SpeakerAlias: "Emcee", SpeakerId: "Alnilam"}, &texttospeechpb.MultispeakerPrebuiltVoice{SpeakerAlias: "GameAnnouncer", SpeakerId: "Achernar"}}},
		},
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
