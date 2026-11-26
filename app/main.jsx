import { takes } from 'virtual:deck-slides'
import config from 'virtual:deck-config'
import { mount } from '../src/presenter.jsx'

mount(document.getElementById('root'), takes, config)
