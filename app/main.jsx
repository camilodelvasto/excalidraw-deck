// The app shell the CLI runs. The user's project arrives as virtual modules: their
// slides.js and the merged deck.yaml. The shell wires them to the presenter — nothing else.
import { takes } from 'virtual:deck-slides'
import config from 'virtual:deck-config'
import { mount } from '../src/presenter.jsx'

mount(document.getElementById('root'), takes, config)
