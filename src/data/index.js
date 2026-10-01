// Gom toàn bộ dữ liệu game, tiêm vào lõi qua ctx.data.

import { BALANCE } from './balance.js'
import { INGREDIENTS } from './ingredients.js'
import { RECIPES, METHOD_LABELS, ROLE_LABELS } from './recipes.js'
import { MINIGAME_TYPES } from './minigame-types.js'
import { PERSONAS, REGULARS, NAMES } from './customers.js'
import { DIALOGUE, SPOKEN, SYNONYMS, LINE_KINDS, makeSpeech, makeLine, describeLine, readbackText } from './dialogue.js'
import { REVIEWS, makeReview } from './reviews.js'
import { TIPS, TIP_GROUPS, TIP_GROUP_REWARDS, tipsForTrigger } from './tips.js'
import { UPGRADES } from './upgrades.js'
import { STRINGS } from './strings.js'
import { CHECKIN } from './checkin.js'
import { QUESTS, QUEST_GROUPS, QUEST_CONFIG } from './quests.js'
import { MAIL_CONFIG, MAIL_WELCOME, MAIL_VERSIONS, MAIL_HOLIDAYS, MAIL_EVERYDAY, MAIL_LATE_REVIEW, MAIL_QUEST } from './mail.js'
import { CHAINS, NPCS, CHAIN_WHERE } from './chains.js'
import { SHOP, ITEMS, COSMETICS, TITLES, UNLOCKS } from './shop.js'
import { EVENTS } from './events.js'
import { DAY_EVENTS, DAY_EVENT_CONFIG } from './day-events.js'
import { STAGE_UP, POST_GOALS } from './progression.js'
import { INCIDENTS, INCIDENT_CONFIG } from './incidents.js'
import { RARE_CONFIG, STALLS, STRANGERS } from './rare.js'
import { TOURS, TOUR_SCREENS, HOW_TO_PLAY } from './tours.js'

export const DATA = Object.freeze({
  BALANCE, INGREDIENTS, RECIPES, METHOD_LABELS, MINIGAME_TYPES,
  PERSONAS, REGULARS, NAMES, DIALOGUE, makeSpeech, makeLine, makeReview, TIPS, UPGRADES, STRINGS,
  // Bổ sung ngoài hợp đồng (chỉ thêm, không đổi):
  ROLE_LABELS, SPOKEN, SYNONYMS, LINE_KINDS, REVIEWS, TIP_GROUPS,
  describeLine, readbackText, tipsForTrigger,
  // M2: hệ thống meta
  CHECKIN, QUESTS, QUEST_GROUPS, QUEST_CONFIG,
  MAIL_CONFIG, MAIL_WELCOME, MAIL_VERSIONS, MAIL_HOLIDAYS, MAIL_EVERYDAY, MAIL_LATE_REVIEW, MAIL_QUEST,
  CHAINS, NPCS, CHAIN_WHERE, SHOP, ITEMS, COSMETICS, TITLES, UNLOCKS,
  EVENTS, DAY_EVENTS, DAY_EVENT_CONFIG, STAGE_UP, POST_GOALS,
  // M3: tình huống trong ca, thưởng đủ nhóm Sổ tay nghề
  INCIDENTS, INCIDENT_CONFIG, TIP_GROUP_REWARDS,
  // M4: nguyên liệu và công thức hiếm (phiên hàng, khách lạ)
  RARE_CONFIG, STALLS, STRANGERS,
  // 0.4.1: hướng dẫn lần đầu (tour) và trang Cách chơi
  TOURS, TOUR_SCREENS, HOW_TO_PLAY
})

export {
  BALANCE, INGREDIENTS, RECIPES, METHOD_LABELS, ROLE_LABELS, MINIGAME_TYPES,
  PERSONAS, REGULARS, NAMES, DIALOGUE, SPOKEN, SYNONYMS, LINE_KINDS, makeSpeech, makeLine,
  describeLine, readbackText, REVIEWS, makeReview, TIPS, TIP_GROUPS, tipsForTrigger, UPGRADES, STRINGS,
  CHECKIN, QUESTS, QUEST_GROUPS, QUEST_CONFIG,
  MAIL_CONFIG, MAIL_WELCOME, MAIL_VERSIONS, MAIL_HOLIDAYS, MAIL_EVERYDAY, MAIL_LATE_REVIEW, MAIL_QUEST,
  CHAINS, NPCS, CHAIN_WHERE, SHOP, ITEMS, COSMETICS, TITLES, UNLOCKS,
  EVENTS, DAY_EVENTS, DAY_EVENT_CONFIG, STAGE_UP, POST_GOALS,
  INCIDENTS, INCIDENT_CONFIG, TIP_GROUP_REWARDS,
  RARE_CONFIG, STALLS, STRANGERS,
  TOURS, TOUR_SCREENS, HOW_TO_PLAY
}
