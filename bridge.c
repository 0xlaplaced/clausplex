#include "source/src/globals.h"
#include <SDL.h>
#include <emscripten.h>
int claus_touch_mask=0;
extern uint8_t byte_5A19B;
static int paused=0, outcome=0, outcome_seconds=0;
/* Observe the engine's completion flag before its legacy menu clears it.
   The quit countdown also runs on a successful exit, so it is not a loss. */
void claus_observe(void){
    if(outcome || !gIsGameRunning)return;
    if(byte_5A19B)outcome=1;
    else if(gShouldKillMurphy || gQuitLevelCountdown>0)outcome=2;
    if(outcome)outcome_seconds=gGameSeconds+60*gGameMinutes+3600*gGameHours;
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
