// 防止 windows 调试控制台
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    panpankan_lib::run()
}
