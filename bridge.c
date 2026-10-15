#include "source/src/globals.h"
#include <SDL.h>
#include <emscripten.h>
#include <stdio.h>
#include <stdlib.h>
int claus_touch_mask=0;
extern uint8_t byte_5A19B;
static int paused=0, outcome=0, outcome_seconds=0;
extern uint16_t gRandomGeneratorSeed;
static unsigned char capture[4096];
static unsigned capture_length=0, capture_steps=0, capture_seed=0;
static int capture_overflow=0, ranked_seed=-1, capture_frozen=0;
void claus_set_ranked_seed(int seed){ranked_seed=seed>=0 && seed<=65535?seed:-1;}
void claus_run_begin(void){
    capture_length=0;capture_steps=0;capture_overflow=0;capture_frozen=0;
    outcome=0;outcome_seconds=0;
    if(ranked_seed>=0)gRandomGeneratorSeed=(uint16_t)ranked_seed;
    capture_seed=gRandomGeneratorSeed;
}
void claus_capture_input(int input){
    if(capture_frozen || !gIsGameRunning)return;
    if(input>9 || capture_steps>=126000){capture_overflow=1;return;}
    capture_steps++;
    if(capture_length && (capture[capture_length-1]&15)==input && (capture[capture_length-1]>>4)<15){capture[capture_length-1]+=16;return;}
    if(capture_length>=sizeof(capture)){capture_overflow=1;return;}
    capture[capture_length++]=input;
}
int claus_capture_length(void){return capture_length;}
int claus_capture_byte(int index){return index>=0 && index<(int)capture_length?capture[index]:-1;}
int claus_capture_steps(void){return capture_steps;}
int claus_capture_seed(void){return capture_seed;}
int claus_capture_valid(void){return !capture_overflow && outcome==1;}
/* Observe the engine's completion flag before its legacy menu clears it.
   The quit countdown also runs on a successful exit, so it is not a loss. */
void claus_observe(void){
    if(outcome || !gIsGameRunning)return;
    if(byte_5A19B)outcome=1;
    else if(gShouldKillMurphy || gQuitLevelCountdown>0)outcome=2;
    if(outcome){capture_frozen=1;outcome_seconds=gGameSeconds+60*gGameMinutes+3600*gGameHours;}
}
void claus_run_finished(void){
    claus_observe();
    if(gFastMode!=FastModeTypeUltra)return;
    printf("CLAUSPLEX_VERIFY {\"won\":%d,\"steps\":%u,\"seed\":%u,\"bytes\":%u,\"valid\":%d}\n",outcome==1,capture_steps,capture_seed,capture_length,!capture_overflow && outcome==1);
    const char *path=getenv("CLAUSPLEX_CAPTURE_FILE");
    if(path){FILE *f=fopen(path,"wb");if(f){fwrite(capture,1,capture_length,f);fclose(f);}}
}
static uint32_t pause_start=0,paused_ticks=0;
void claus_touch(int mask){claus_touch_mask=mask & 31;}
void claus_pause(int value){
    if(value && !paused){pause_start=SDL_GetTicks();paused=1;}
    else if(!value && paused){paused_ticks+=SDL_GetTicks()-pause_start;paused=0;}
}
uint32_t claus_time(void){return SDL_GetTicks()-paused_ticks-(paused ? SDL_GetTicks()-pause_start : 0);}
void claus_wait_if_paused(void){while(paused)emscripten_sleep(20);}
int claus_x(void){return gMurphyPositionX;}
int claus_y(void){return gMurphyPositionY;}
int claus_remaining(void){return gNumberOfRemainingInfotrons;}
int claus_red(void){return gNumberOfRemainingRedDisks;}
int claus_running(void){return gIsGameRunning && !paused;}
int claus_seconds(void){return outcome ? outcome_seconds : gGameSeconds+60*gGameMinutes+3600*gGameHours;}
int claus_won(void){return outcome==1 || byte_5A19B;}
int claus_dead(void){return outcome==2 || (!byte_5A19B && (gShouldKillMurphy || gQuitLevelCountdown>0));}
int claus_frame(void){return gFrameCounter;}
int claus_scroll_x(void){return gScrollOffsetX;}
int claus_scroll_y(void){return gScrollOffsetY;}
int claus_demo(void){return gIsPlayingDemo;}
int claus_outcome(void){return outcome;}
