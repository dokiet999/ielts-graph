# Generates the two Speaking recordings of case C with the Windows text-to-speech voice "Microsoft Zira"
# (16 kHz mono WAV). The recordings are synthetic: they test the pipeline, not real learners.
# Run from this folder:  powershell -File make_speech.ps1
Add-Type -AssemblyName System.Speech
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

function Save-Speech($ssmlFile, $wavFile) {
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.SelectVoice('Microsoft Zira Desktop')
    $fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
    $synth.SetOutputToWaveFile((Join-Path $here $wavFile), $fmt)
    $synth.SpeakSsml((Get-Content -Raw -Encoding UTF8 (Join-Path $here $ssmlFile)))
    $synth.Dispose()
}

Save-Speech 'c1_attempt1.ssml' 'c1_attempt1.wav'
Save-Speech 'c1_attempt2.ssml' 'c1_attempt2.wav'
Get-ChildItem $here -Filter *.wav | ForEach-Object { '{0} {1} bytes' -f $_.Name, $_.Length }
