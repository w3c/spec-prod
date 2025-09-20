import type { Inputs } from "./prepare.ts";
import { yesOrNo } from "./utils.ts";

export function validation(inputs: Inputs) {
	const input_markup = yesOrNo(inputs.VALIDATE_INPUT_MARKUP) || false;
	const links = yesOrNo(inputs.VALIDATE_LINKS) || false;
	const markup = yesOrNo(inputs.VALIDATE_MARKUP) || false;
	const pubrules = yesOrNo(inputs.VALIDATE_PUBRULES) || false;
	const webidl = yesOrNo(inputs.VALIDATE_WEBIDL) || false;
	return { input_markup, links, markup, pubrules, webidl };
}
