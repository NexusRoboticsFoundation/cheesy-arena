package voice

import (
	"fmt"
	"log"
	"math/rand"
	"strings"

	"github.com/Team254/cheesy-arena/model"
)

type TeamDetails int

const (
	None TeamDetails = iota
	School
	Location
	Sponsors
)

func GetMatchIntroScript(match *model.Match, teams [6]*model.Team, details TeamDetails) string {
	var matchName = "this match"
	switch match.Type {
		case model.Practice: matchName = fmt.Sprintf("Practice match %d", match.TypeOrder)
		case model.Qualification: matchName = fmt.Sprintf("Qualification %d", match.TypeOrder)
	}

	var script = "Emcee: "
	var intro = fmt.Sprintf(getRandom([]string{"Let's meet the teams in %s.", "Up next is %s.", "%s is up next.", "%s is next, let's meet the teams.", "It's %s."}), matchName)

	if match.Type == model.Playoff {
		intro = fmt.Sprintf("We're in %s bracket match %d. Alliance %d is in red, Alliance %d is in blue. Let's meet the teams.", match.NameDetail, match.TypeOrder, match.PlayoffRedAlliance, match.PlayoffBlueAlliance)
	}

	if strings.Contains(match.LongName, "Final") {
		intro = fmt.Sprintf("We've made it to the finals!! Alliance %d is in red, Alliance %d is in blue. Let's meet the teams.", match.PlayoffRedAlliance, match.PlayoffBlueAlliance)
	}

	script += fmt.Sprintf("%s [pause] On the red alliance, it's team %s!", intro, getTeamNumber(match.Red1, teams[0]))
	script += getTeamDescription(teams[0], details)
	script += fmt.Sprintf("\nEmcee: And their partners team %s!", getTeamNumber(match.Red2, teams[1]))
	script += getTeamDescription(teams[1], details)
	script += fmt.Sprintf("\nEmcee: And team %s!", getTeamNumber(match.Red3, teams[2]))
	script += getTeamDescription(teams[2], details)

	script += fmt.Sprintf(getRandom([]string{"\nEmcee: Over on the blue alliance, it's team %s!", "\nEmcee: And on the blue alliance, it's team %s!", "\nEmcee: On the blue alliance, it's team %s!", "\nEmcee: Over on the other side of the field, it's team %s!"}), getTeamNumber(match.Blue1, teams[3]))
	script += getTeamDescription(teams[3], details)
	script += fmt.Sprintf("\nEmcee: And their partners team %s!", getTeamNumber(match.Blue2, teams[4]))
	script += getTeamDescription(teams[4], details)
	script += fmt.Sprintf("\nEmcee: And finally team %s!", getTeamNumber(match.Blue3, teams[5]))
	script += getTeamDescription(teams[5], details)

	log.Printf("script: %s", script)

	return script
}

func GetMatchReminderScript(match *model.Match) string {
	var matchName = "this match"
	switch match.Type {
		case model.Practice: matchName = fmt.Sprintf("Practice match %d", match.TypeOrder)
		case model.Qualification: matchName = fmt.Sprintf("Qualification %d", match.TypeOrder)
		case model.Playoff: matchName = fmt.Sprintf("Playoff match %d", match.TypeOrder)
	}

	var playoffDetail = " "
	if match.Type == model.Playoff {
		if strings.Contains(match.LongName, "Final") {
			matchName = match.LongName
		} else {
			if strings.Contains(match.NameDetail, "Upper") {
				playoffDetail += "The loser of this match will move down to the lower bracket"
			} else {
				playoffDetail += "[serious] The loser of this match will be eliminated"
			}
		}
	}

	var script = ""
	script += fmt.Sprintf(getRandom([]string{"This is %s.", "We're almost ready to start %s.", "%s is almost ready.", "%s will start soon.", "Robots are almost ready for %s.", "The field is almost ready for %s."}), matchName)
	script += playoffDetail

	log.Printf("script: %s", script)

	return script
}

func getTeamNumber(id int, team *model.Team) string {
	if team == nil || team.IntroNumber == "" {
		return fmt.Sprintf("%d", id)
	}

	return team.IntroNumber
}

func getTeamDescription(team *model.Team, details TeamDetails) string {
	if team == nil || strings.TrimSpace(team.IntroNickname) == "" {
		return ""
	}

	var result = "\nGameAnnouncer: "

	switch(details) {
		case None: result += fmt.Sprintf("%s.", team.IntroNickname)
		case School:
			if team.SchoolName == "" {
				result += fmt.Sprintf("\"%s\"", team.IntroNickname)
			} else if team.SchoolName == "Family/Community" && team.IntroLocation != "" {
				result += fmt.Sprintf("They're a community team based in %s, it's \"%s\".", team.IntroLocation, team.IntroNickname)
			} else {
				result += fmt.Sprintf("From %s, it's \"%s\".", team.SchoolName, team.IntroNickname)
			}
		case Location:
			if team.IntroLocation == "" {
				result += fmt.Sprintf("%s", team.IntroNickname)
			} else {
				result += fmt.Sprintf("From %s, it's \"%s\".", team.IntroLocation, team.IntroNickname)
			}
		case Sponsors: result += fmt.Sprintf("Sponsored by %s- it's \"%s\".", strings.Replace(team.IntroSponsors, "&", "&amp;", -1), team.IntroNickname)
	}

	return result
}

func getRandom(options []string) string {
	randomIndex := rand.Intn(len(options))
	return options[randomIndex]
}
