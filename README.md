# Sky Clock for Windows

A desktop version of the Sky Clock widget: Eastern-time clock, Tallahassee day/night tracker (Dawn, Day, Dusk, Night),
a Custom wake time with auto-reset, time zones with work-culture notes, tracked times, and an alarm timer.

## What it does that the browser version can't
- Lives in its own window and the system tray, so it is not stuck in a browser tab.
- **Always on top** pin (the pin button, or the tray menu).
- Keyboard shortcuts, working from anywhere (see below).
- Closing the window (X) hides it to the tray so alarms and tracked times keep working. Right-click the tray icon and choose Quit to exit.
- Real Windows notifications when an alarm or a tracked time arrives, even if the window is hidden.
- Optional **Start with Windows** (tray menu).
- Remembers its size and position.

## Keyboard shortcuts
| Shortcut | What it does |
|---|---|
| **Alt+Shift+K** | Show the app, or hide it to the tray (works from anywhere while Sky Clock is running) |
| **Alt+Shift+B** | Switch the background between Sky and Black |
| **Alt+Shift+Q** | Quit the app completely |
| **Ctrl+B** | Switch Sky / Black (only while the window is selected) |
| **Ctrl+W** | Hide the window (only while the window is selected) |
| **Ctrl+Q** | Quit (only while the window is selected) |

Change the two global shortcuts at the bottom of the app under **Keyboard shortcuts**: tap one, then press the new keys.
Backspace turns a shortcut off, Esc cancels, and "Reset to defaults" restores the originals.
A shortcut needs Ctrl, Alt or the Windows key plus another key. If a combination is already taken by another program, the app tells you.

To open it when it is fully closed, give its Start menu or desktop shortcut a hotkey: right-click the Sky Clock shortcut, choose
**Properties**, click the **Shortcut key** box, and press a key (Windows adds Ctrl+Alt for you).
The easiest setup is the tray menu option **Start with Windows**, so the app is always running and Alt+Shift+K is always ready.

## Elapsed time
Every timer has its own **elapsed** switch. When it is on, the app counts up from the moment a timer goes off, shown as `-3m 12s` in orange.
Once it passes the length you gave the timer, it turns red and pulses, with `lapsed + <the length you gave>` next to it in small raised text. Only the numbers change colour; progress bars never do.
- **Time until:** each timer has a switch, off by default. Switch it on for a time that already went off today (say a 10:00 AM timer at 10:52) and it counts up from that earlier 10:00 AM instead of counting down to tomorrow. Tap the green check to start its next countdown. Give a timer a title when you add it, or click the small text under the time to rename it. Long titles are shortened; hover to see the full title.
- **Alarm timer:** its own switch (on by default).
- **Pomodoro:** after a pomodoro ends, the *Keep counting time after a pomodoro ends* switch decides whether the time since then keeps counting (orange, then red) or whether you just see **Time's up**.

## Alarm sound
When the alarm timer ends it rings again and again for up to a minute until you press **Silence**, **Again** or **Dismiss**,
and a Windows notification appears (click it to open the app). **Test alarm sound** under the alarm timer plays it once so you can check your volume.

## Pomodoro tracking
The **Pomodoro (focus timer)** card runs focus sessions of up to **7 pomodoros**. Set hours and minutes (or tap a preset); when one ends you start the next.
- **Pause / Resume** freezes the countdown and all time tracking. The "Ends at" time moves later by exactly the time you were paused.
- While a pomodoro runs you can press **Done early** (it counts as completed, with the time you actually worked), **Quit this one** (count it as quit early, or discard it; the session carries on) or **Exit & see total** (the running pomodoro counts as quit early and the session ends).
- A session ends when you press **Exit & see total**, **End session & see total**, or when the 7th pomodoro finishes. A session in which nothing was recorded is not counted.
- Stopping within 15 seconds is treated as a slip: it is not recorded and it does not use up one of the 7.
- After a pomodoro ends, **Keep counting time after a pomodoro ends** (shown only then) lets the time keep counting toward your total until you start the next one or end the session. While it is counting, the **End session & see total** button has a slowly moving striped border (a different colour for the Sky and Black backgrounds); turn counting off and the stripes stop.
- **Show time worked** hides or shows the *Worked so far* line.

**Averages.** For every day (Eastern date) the app keeps four running sums: how many full pomodoros and their total seconds, and how many were quit early and their total seconds.
An average is simply sum / count, so it is exact, and a new day starts a fresh entry (that is the daily reset) while all earlier days stay remembered (about four months).
The card shows today's **full** and **quit-early** averages (with how far through the plan you usually get when you quit, as a percentage of the planned time, because pomodoros differ in length), your completion (pomodoros finished, and also the share of planned time you worked, so 58 of 60 minutes counts as 97%), the last 7 days combined (sums are added first, then divided, so busy days count for more) and an optional history.
Quitting within 15 seconds is treated as a slip and not recorded. A pomodoro whose time ran out counts as full, even if the app was closed when it ended. Time counted after a pomodoro goes into your *worked* total, not into the averages.

## Files
- `main.js` the Windows shell (e.g., window, tray, shortcut, notifications, etc...)
- `preload.js` bridge between shell and the page
- `index.html` + `renderer.js` just the widget itself
- `assets/icon.png` just the app icon
- `.github/workflows/build.yml` helped me build the .exe for on GitHub (pretty cool i know)
