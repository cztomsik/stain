use crate::commons::{Pos, SurfaceId, Color, BorderRadius, Border, BoxShadow, Image};
use crate::picker::SurfacePicker;
use crate::box_layout::{BoxLayout, StretchLayout};
use crate::text_layout::{TextLayout, Text};
use crate::render::Renderer;
use miniserde::{Deserialize, Serialize};

pub struct Window {
    box_layout: Box<dyn BoxLayout>,
    text_layout: TextLayout,
    renderer: Renderer,

    mouse_pos: Pos,
    picker: SurfacePicker,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Event {
    kind: EventKind,
    target: SurfaceId,
    key: u16,
}

impl Event {
    // TODO: private
    pub fn new(kind: EventKind, target: SurfaceId, key: u16) -> Self {
        Self { kind, target, key }
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub enum EventKind {
    MouseMove,
    MouseDown,
    MouseUp,
    Scroll,
    KeyDown,
    KeyPress,
    KeyUp,
    Focus,
    Blur,
    Resize,
    Close,
    Unknown,    
}

impl Window {
    pub fn new(width: u32, height: u32) -> Self {
        Window {
            mouse_pos: Pos::zero(),

            box_layout: Box::new(StretchLayout::new((width as f32, height as f32))),
            text_layout: TextLayout::new(),
            picker: SurfacePicker::new(),

            renderer: Renderer::new(),
        }
    }

    pub fn mouse_move(&mut self, pos: Pos) -> Event {
        self.mouse_pos = pos;

        Event::new(EventKind::MouseMove, self.get_mouse_target(), 0)
    }

    pub fn scroll(&mut self, _delta: (f32, f32)) -> Event {
        let _target = self.get_mouse_target();

        // TODO: just like ScrollBy/ScrollAt update message (& render() after that)
        //self.renderer.scroll(self.mouse_pos, delta);

        Event::new(EventKind::Scroll, self.get_mouse_target(), 0)
    }

    pub fn mouse_down(&mut self) -> Event {
        Event::new(EventKind::MouseDown, self.get_mouse_target(), 0)
    }

    pub fn mouse_up(&mut self) -> Event {
        Event::new(EventKind::MouseUp, self.get_mouse_target(), 0)
    }

    // apply batch of changes
    // some of this could be done in parallel which means the batch
    // itself or some part of it  has to be passed to somebody who owns
    // all of the systems
    //
    // other things (set_title) can be just plain old methods
    //
    // TODO: introduce some other struct responsible for this
    pub fn update_scene(&mut self, msg: &UpdateSceneMsg) {
        if let Some(n) = msg.alloc {
          for _ in 0..n {
            self.box_layout.alloc();
          }
        }

        if let Some(changes) = &msg.text_changes {
            for SetText { surface, text } in changes {
                self.text_layout.set_text(*surface, text.clone());
                self.renderer.set_text(*surface, text.clone());
            }
        }

        let text_layout = &mut self.text_layout;

        self.box_layout.calculate(&mut |surface, max_width| {
            text_layout.wrap(surface, max_width);

            text_layout.get_size(surface)
        });

        self.renderer.render(&self.box_layout.get_bounds(), &self.text_layout);
    }

    fn get_mouse_target(&self) -> SurfaceId {
        self.picker.pick_at(self.mouse_pos, &self.renderer.scene.children, &self.box_layout.get_bounds())
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateSceneMsg {
    alloc: Option<usize>,
    text_changes: Option<Vec<SetText>>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct SetRadius {
    surface: SurfaceId,
    layout: Option<BorderRadius>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct SetBackgroundColor {
    surface: SurfaceId,
    color: Option<Color>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct SetBorder {
    surface: SurfaceId,
    border: Option<Border>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct SetBoxShadow {
    surface: SurfaceId,
    shadow: Option<BoxShadow>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct SetText {
    surface: SurfaceId,
    text: Option<Text>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct SetImage {
    surface: SurfaceId,
    image: Option<Image>,
}

/*
#[derive(Deserialize, Serialize, Debug)]
pub struct SetOverflow {
    surface: SurfaceId,
    overflow: Overflow,
}
*/
